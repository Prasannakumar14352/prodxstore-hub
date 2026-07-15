import { useState } from "react";
import { motion } from "motion/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Star,
  CheckCircle,
  ThumbsUp,
  MessageSquare,
  Play,
  ImageIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = "newest" | "highest" | "helpful";
type FilterKey = "verified" | "all";

type ReviewMedia = {
  url: string;
  type: string;
  label: string;
};

// ─── Stars ────────────────────────────────────────────────────────────────────

function Stars({ rating, size = 4 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            size === 4 ? "w-4 h-4" : "w-5 h-5",
            rating >= n ? "text-amber-400 fill-amber-400" : "text-white/20"
          )}
        />
      ))}
    </div>
  );
}

// ─── Media gallery ────────────────────────────────────────────────────────────

function MediaGallery({ media }: { media: ReviewMedia[] }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!media.length) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-3">
        {media.map((m, i) => (
          <button
            key={i}
            type="button"
            onClick={() => m.type === "image" && setLightbox(m.url)}
            className={cn(
              "relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-background shrink-0",
              m.type === "image" && "cursor-zoom-in hover:border-primary/40 transition-colors"
            )}
          >
            {m.type === "image" ? (
              <img src={m.url} alt={m.label} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-primary/5">
                <Play className="w-5 h-5 text-primary" />
                <span className="text-[9px] text-muted-foreground">Video</span>
              </div>
            )}
            {/* Label overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
              <p className="text-[8px] text-muted-foreground truncate">{m.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Review screenshot"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </>
  );
}

// ─── Review card ─────────────────────────────────────────────────────────────

function ReviewCard({
  review,
  index,
  onHelpful,
}: {
  review: {
    _id: Id<"reviews">;
    _creationTime: number;
    customerName: string;
    rating: number;
    title?: string;
    body: string;
    isVerifiedBuyer: boolean;
    helpful: number;
    mediaUrls?: string[];
    mediaTypes?: string[];
    mediaLabels?: string[];
  };
  index: number;
  onHelpful: (id: Id<"reviews">) => void;
}) {
  const [voted, setVoted] = useState(false);
  const date = new Date(review._creationTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Build rich media list
  const media: ReviewMedia[] = (review.mediaUrls ?? []).map((url, i) => ({
    url,
    type: review.mediaTypes?.[i] ?? "image",
    label: review.mediaLabels?.[i] ?? "Attachment",
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" as const }}
      className="rounded-2xl border border-white/8 bg-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <Stars rating={review.rating} />
        <span className="text-xs text-muted-foreground">{date}</span>
      </div>

      {review.title && (
        <h4 className="font-semibold text-foreground text-sm mb-1.5">{review.title}</h4>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{review.body}</p>

      {/* Media */}
      {media.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <ImageIcon className="w-3 h-3 text-muted-foreground/60" />
            <span className="text-[11px] text-muted-foreground/60">
              {media.length} attachment{media.length > 1 ? "s" : ""}
            </span>
          </div>
          <MediaGallery media={media} />
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{review.customerName}</span>
          {review.isVerifiedBuyer && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              <CheckCircle className="w-3 h-3" /> Verified Buyer
            </span>
          )}
        </div>

        <button
          onClick={() => {
            if (voted) return;
            setVoted(true);
            onHelpful(review._id);
          }}
          disabled={voted}
          className={cn(
            "inline-flex items-center gap-1.5 text-xs rounded-full border px-3 py-1.5 transition-colors",
            voted
              ? "border-primary/40 bg-primary/10 text-primary cursor-default"
              : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground cursor-pointer"
          )}
        >
          <ThumbsUp className="w-3.5 h-3.5" />
          Helpful ({review.helpful})
        </button>
      </div>
    </motion.div>
  );
}

// ─── Reviews Section ─────────────────────────────────────────────────────────

export default function ReviewsSection({
  productId,
}: {
  productId: Id<"products">;
}) {
  const [filter, setFilter] = useState<FilterKey>("verified");
  const [sort, setSort] = useState<SortKey>("newest");

  const stats = useQuery(api.reviews.getRatingStats, { productId });
  const reviews = useQuery(api.reviews.getByProduct, {
    productId,
    statusFilter: "approved",
    sort,
    verifiedOnly: filter === "verified",
  });
  const markHelpful = useMutation(api.reviews.markHelpful);
  const showEmpty = useQuery(api.settings.getShowEmptyReviews);

  const handleHelpful = async (id: Id<"reviews">) => {
    try {
      await markHelpful({ reviewId: id });
    } catch {
      toast.error("Could not record your vote.");
    }
  };

  const loading = stats === undefined || reviews === undefined;

  // Hide section entirely when no reviews and admin disabled empty section display
  if (!loading && stats.total === 0 && showEmpty === false) return null;

  return (
    <section id="reviews" className="mt-24 scroll-mt-24">
      <h2 className="text-xl font-bold tracking-tight mb-6">Customer Reviews</h2>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      ) : stats.total === 0 ? (
        <Empty className="rounded-2xl border border-white/8 bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon"><MessageSquare /></EmptyMedia>
            <EmptyTitle>No customer reviews yet.</EmptyTitle>
            <EmptyDescription>Be the first to share your experience after your purchase.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Overview + breakdown */}
          <div className="grid md:grid-cols-2 gap-6 rounded-2xl border border-white/8 bg-card p-6 mb-6">
            <div className="flex flex-col items-center justify-center text-center md:border-r md:border-white/8">
              <div className="text-5xl font-bold text-foreground mb-2">{stats.average.toFixed(1)}</div>
              <Stars rating={Math.round(stats.average)} size={5} />
              <p className="text-sm text-muted-foreground mt-2">
                {stats.total} {stats.total === 1 ? "review" : "reviews"}
              </p>
            </div>

            <div className="space-y-2">
              {([5, 4, 3, 2, 1] as const).map((star) => {
                const count = stats.breakdown[star];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3 text-xs">
                    <span className="w-8 text-muted-foreground shrink-0">{star} star</span>
                    <div className="flex-1 h-2 rounded-full bg-white/8 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground shrink-0">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters + sort */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2">
              {(
                [
                  { key: "verified", label: "Verified Buyers" },
                  { key: "all", label: "All Reviews" },
                ] satisfies { key: FilterKey; label: string }[]
              ).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors cursor-pointer",
                    filter === f.key
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="highest">Highest Rating</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Review list */}
          {reviews.length === 0 ? (
            <div className="rounded-2xl border border-white/8 bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground">No reviews match this filter.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r, i) => (
                <ReviewCard key={r._id} review={r} index={i} onHelpful={handleHelpful} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
