import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { motion, AnimatePresence } from "motion/react";
import {
  Star,
  CheckCircle,
  Check,
  X,
  Eye,
  EyeOff,
  Star as StarIcon,
  Trash2,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Tag,
  ImageIcon,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

// ─── Types ────────────────────────────────────────────────────────────────────

type Review = Doc<"reviews">;
type StatusFilter = "all" | "pending" | "approved" | "rejected" | "hidden";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "w-3.5 h-3.5",
            rating >= n ? "text-amber-400 fill-amber-400" : "text-white/20"
          )}
        />
      ))}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-yellow-500/10 border-yellow-500/30 text-yellow-400",
  approved: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
  rejected: "bg-red-500/10 border-red-500/30 text-red-400",
  hidden:   "bg-white/5 border-white/10 text-muted-foreground",
};

function spamColor(score: number) {
  if (score >= 0.7) return "text-red-400";
  if (score >= 0.4) return "text-yellow-400";
  return "text-emerald-400";
}

// ─── Admin media panel (resolves URLs from storage) ──────────────────────────

function AdminMediaPanel({
  reviewId,
  mediaLabels,
  mediaTypes,
}: {
  reviewId: Id<"reviews">;
  mediaLabels: string[];
  mediaTypes: string[];
}) {
  const urls = useQuery(api.reviews.adminGetMediaUrls, { reviewId });
  const [lightbox, setLightbox] = useState<string | null>(null);

  if (!urls?.length) return null;

  return (
    <div className="rounded-lg border border-white/8 bg-background/50 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-xs text-muted-foreground font-medium">
          Media attachments ({urls.length})
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => {
          const type = mediaTypes[i] ?? "image";
          const label = mediaLabels[i] ?? "Attachment";
          return (
            <button
              key={i}
              type="button"
              onClick={() => type === "image" && setLightbox(url)}
              className={cn(
                "relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-background",
                type === "image" && "cursor-zoom-in hover:border-primary/40 transition-colors"
              )}
            >
              {type === "image" ? (
                <img src={url} alt={label} className="w-full h-full object-cover" />
              ) : (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-full flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play className="w-5 h-5 text-primary" />
                  <span className="text-[9px] text-muted-foreground">Play video</span>
                </a>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
                <p className="text-[8px] text-muted-foreground truncate">{label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Review media"
            className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}

// ─── Single review row ────────────────────────────────────────────────────────

function ReviewRow({ review, productNames }: { review: Review; productNames: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setStatus = useMutation(api.reviews.adminSetStatus);
  const toggleFeatured = useMutation(api.reviews.adminToggleFeatured);
  const deleteReview = useMutation(api.reviews.adminDelete);
  const polishReview = useAction(api.reviewsAi.polishReview);

  const productName = productNames[review.productId] ?? "Unknown Product";
  const hasAi = review.aiProcessed === true;

  const handleStatus = async (status: Review["status"]) => {
    try {
      await setStatus({ reviewId: review._id, status });
      toast.success(`Review ${status}`);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "Failed";
      toast.error(msg);
    }
  };

  const handleFeature = async () => {
    try {
      await toggleFeatured({ reviewId: review._id });
      toast.success(review.isFeatured ? "Removed from featured" : "Marked as featured");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handlePolish = async () => {
    setPolishing(true);
    try {
      await polishReview({ reviewId: review._id });
      toast.success("AI polish complete — review updated");
      setExpanded(true);
      setShowOriginal(false);
    } catch (e) {
      const msg = e instanceof ConvexError ? (e.data as { message: string }).message : "AI polish failed";
      toast.error(msg);
    } finally {
      setPolishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await deleteReview({ reviewId: review._id });
      toast.success("Review deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const displayTitle = showOriginal ? review.title : (review.aiTitle ?? review.title);
  const displayBody  = showOriginal ? review.body  : (review.aiBody  ?? review.body);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="rounded-xl border border-white/8 bg-card overflow-hidden"
    >
      {/* Row header */}
      <div className="p-4 flex items-start gap-3">
        {/* Stars + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Stars rating={review.rating} />
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
              STATUS_STYLES[review.status] ?? STATUS_STYLES.hidden
            )}>
              {review.status}
            </span>
            {review.isVerifiedBuyer && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                <CheckCircle className="w-3 h-3" /> Verified Buyer
              </span>
            )}
            {review.isFeatured && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                <StarIcon className="w-3 h-3" /> Featured
              </span>
            )}
            {hasAi && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">
                <Sparkles className="w-3 h-3" /> AI polished
              </span>
            )}
            {review.aiSpamScore !== undefined && review.aiSpamScore >= 0.5 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                <AlertTriangle className="w-3 h-3" /> Spam risk
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground truncate">
            {review.title ?? review.aiTitle ?? "(no headline)"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{review.body}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{review.customerName}</span>
            <span>·</span>
            <span className="truncate max-w-[120px]">{productName}</span>
            <span>·</span>
            <span>{new Date(review._creationTime).toLocaleDateString()}</span>
            {review.aiCategory && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 text-violet-400">
                  <Tag className="w-3 h-3" />{review.aiCategory}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-8 h-8 rounded-lg border border-white/8 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" as const }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/8 pt-4">
              {/* Original vs AI toggle */}
              {hasAi && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowOriginal((s) => !s)}
                    className={cn(
                      "text-xs rounded-full px-3 py-1 border transition-colors cursor-pointer",
                      showOriginal
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {showOriginal ? "Showing original" : "Showing AI version"}
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Click to toggle between original and AI-polished text
                  </span>
                </div>
              )}

              {/* Review content */}
              <div className="rounded-lg border border-white/8 bg-background/50 p-4 space-y-2">
                {displayTitle && (
                  <p className="text-sm font-semibold text-foreground">{displayTitle}</p>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{displayBody}</p>
              </div>

              {/* Media attachments */}
              {(review.mediaStorageIds?.length ?? 0) > 0 && (
                <AdminMediaPanel reviewId={review._id} mediaLabels={review.mediaLabels ?? []} mediaTypes={review.mediaTypes ?? []} />
              )}

              {/* AI details */}
              {hasAi && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Category", value: review.aiCategory ?? "—" },
                    {
                      label: "Spam score",
                      value: review.aiSpamScore !== undefined ? `${Math.round(review.aiSpamScore * 100)}%` : "—",
                      className: review.aiSpamScore !== undefined ? spamColor(review.aiSpamScore) : "",
                    },
                    { label: "Helpful votes", value: String(review.helpful ?? 0) },
                    { label: "Order #", value: review.orderNumber ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-white/8 bg-background/50 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                      <p className={cn("text-sm font-semibold text-foreground", item.className)}>{item.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {review.status !== "approved" && (
                  <Button size="sm" className="rounded-full gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleStatus("approved")}>
                    <Check className="w-3.5 h-3.5" /> Approve
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button size="sm" variant="secondary" className="rounded-full gap-1.5 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleStatus("rejected")}>
                    <X className="w-3.5 h-3.5" /> Reject
                  </Button>
                )}
                {review.status !== "hidden" && (
                  <Button size="sm" variant="secondary" className="rounded-full gap-1.5 h-8 text-xs"
                    onClick={() => handleStatus("hidden")}>
                    <EyeOff className="w-3.5 h-3.5" /> Hide
                  </Button>
                )}
                {review.status !== "pending" && (
                  <Button size="sm" variant="secondary" className="rounded-full gap-1.5 h-8 text-xs"
                    onClick={() => handleStatus("pending")}>
                    <Eye className="w-3.5 h-3.5" /> Reset to pending
                  </Button>
                )}

                <Button size="sm" variant="secondary"
                  className={cn("rounded-full gap-1.5 h-8 text-xs",
                    review.isFeatured ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10" : "")}
                  onClick={handleFeature}>
                  <StarIcon className="w-3.5 h-3.5" />
                  {review.isFeatured ? "Unfeature" : "Feature"}
                </Button>

                <Button size="sm" variant="secondary"
                  className="rounded-full gap-1.5 h-8 text-xs border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                  disabled={polishing}
                  onClick={handlePolish}>
                  {polishing
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Sparkles className="w-3.5 h-3.5" />}
                  {polishing ? "Polishing…" : hasAi ? "Re-polish" : "AI polish"}
                </Button>

                <Button size="sm" variant="secondary"
                  className={cn(
                    "rounded-full gap-1.5 h-8 text-xs ml-auto",
                    confirmDelete ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-red-500/20 text-red-400/60 hover:text-red-400 hover:border-red-500/40"
                  )}
                  onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5" />
                  {confirmDelete ? "Confirm delete" : "Delete"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Reviews Tab ──────────────────────────────────────────────────────────────

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "hidden",   label: "Hidden" },
];

export default function ReviewsTab() {
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const reviews  = useQuery(api.reviews.adminList, { statusFilter: filter });
  const pending  = useQuery(api.reviews.pendingCount, {});
  const products = useQuery(api.products.list);

  const productNames: Record<string, string> = {};
  for (const p of products ?? []) productNames[p._id] = p.name;

  const loading = reviews === undefined;

  // Stats counts from the "all" list
  const counts = {
    pending:  pending ?? 0,
    approved: (reviews ?? []).filter((r) => r.status === "approved").length,
    rejected: (reviews ?? []).filter((r) => r.status === "rejected").length,
    hidden:   (reviews ?? []).filter((r) => r.status === "hidden").length,
  };

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Pending",  value: counts.pending,  color: "text-yellow-400" },
          { label: "Approved", value: counts.approved, color: "text-emerald-400" },
          { label: "Rejected", value: counts.rejected, color: "text-red-400" },
          { label: "Hidden",   value: counts.hidden,   color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-card p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "relative text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors cursor-pointer",
              filter === f.key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.key === "pending" && (pending ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 text-background text-[10px] font-bold flex items-center justify-center">
                {(pending ?? 0) > 9 ? "9+" : pending}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-card p-12 text-center">
          <p className="text-muted-foreground text-sm">No reviews in this filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {reviews.map((r) => (
              <ReviewRow key={r._id} review={r} productNames={productNames} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
