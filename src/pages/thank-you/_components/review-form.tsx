import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useMutation, useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { Id } from "@/lib/api/types.ts";
import { ConvexError } from "@/lib/api/values.ts";
import {
  Star,
  PenLine,
  Check,
  Loader2,
  ChevronDown,
  ImagePlus,
  Video,
  X,
  Upload,
  FileImage,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewFormProps = {
  orderToken: string;
  productIds: Id<"products">[];
  defaultName?: string;
};

const MIN_BODY = 20;
const MAX_FILES = 5;
const MAX_FILE_SIZE_MB = 20;

const MEDIA_LABELS = [
  { label: "WhatsApp Screenshot", accept: "image/*", icon: FileImage },
  { label: "Email Screenshot", accept: "image/*", icon: FileImage },
  { label: "Social Media Screenshot", accept: "image/*", icon: FileImage },
  { label: "Video Testimonial", accept: "video/mp4,video/webm,video/mov", icon: Video },
  { label: "Other Screenshot", accept: "image/*", icon: FileImage },
] as const;

type MediaFile = {
  file: File;
  preview: string;       // object URL for images
  label: string;
  type: "image" | "video";
  uploading: boolean;
  storageId?: Id<"_storage">;
  error?: string;
};

// ─── Media thumbnail ──────────────────────────────────────────────────────────

function MediaThumb({
  item,
  onRemove,
}: {
  item: MediaFile;
  onRemove: () => void;
}) {
  return (
    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/10 bg-background shrink-0">
      {item.type === "image" ? (
        <img
          src={item.preview}
          alt={item.label}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <Video className="w-6 h-6 text-primary" />
          <span className="text-[10px] text-muted-foreground text-center px-1 leading-tight line-clamp-2">
            {item.file.name}
          </span>
        </div>
      )}

      {/* Uploading overlay */}
      {item.uploading && (
        <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      {/* Done overlay */}
      {item.storageId && !item.uploading && (
        <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-white" />
        </div>
      )}

      {/* Error */}
      {item.error && (
        <div className="absolute inset-0 bg-red-900/80 flex items-center justify-center p-1">
          <span className="text-[9px] text-red-200 text-center leading-tight">{item.error}</span>
        </div>
      )}

      {/* Remove */}
      {!item.uploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="w-2.5 h-2.5" />
        </button>
      )}

      {/* Label tag */}
      <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
        <p className="text-[9px] text-muted-foreground truncate">{item.label}</p>
      </div>
    </div>
  );
}

// ─── Review Form ──────────────────────────────────────────────────────────────

export default function ReviewForm({
  orderToken,
  productIds,
  defaultName,
}: ReviewFormProps) {
  const allProducts = useQuery(api.products.list);
  const submit = useMutation(api.reviews.submit);
  const uploadReviewMedia = useMutation(api.storage.uploadReviewMedia);

  const [open, setOpen] = useState(false);
  const [activeProduct, setActiveProduct] = useState<Id<"products">>(productIds[0]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState(defaultName ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingLabel, setPendingLabel] = useState<string>("");

  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of allProducts ?? []) map[p._id] = p.name;
    return map;
  }, [allProducts]);

  const uniqueIds = useMemo(() => [...new Set(productIds)], [productIds]);
  const multi = uniqueIds.length > 1;

  const resetFields = () => {
    setRating(0);
    setHover(0);
    setTitle("");
    setBody("");
    setMediaFiles([]);
    setShowMediaPicker(false);
  };

  const switchProduct = (id: Id<"products">) => {
    setActiveProduct(id);
    resetFields();
  };

  // ── Upload a single file to Supabase Storage ────────────────────────────────

  const uploadFile = async (file: File, idx: number) => {
    // Mark as uploading
    setMediaFiles((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, uploading: true, error: undefined } : m))
    );

    try {
      const storageId = await uploadReviewMedia({ file });

      setMediaFiles((prev) =>
        prev.map((m, i) => (i === idx ? { ...m, uploading: false, storageId } : m))
      );
    } catch {
      setMediaFiles((prev) =>
        prev.map((m, i) =>
          i === idx ? { ...m, uploading: false, error: "Upload failed" } : m
        )
      );
    }
  };

  // ── Pick a file after selecting a label ─────────────────────────────────────

  const handleLabelSelect = (label: string, accept: string) => {
    setPendingLabel(label);
    setShowMediaPicker(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingLabel) return;
    e.target.value = "";

    if (mediaFiles.length >= MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files per review`);
      return;
    }

    const sizeMb = file.size / (1024 * 1024);
    if (sizeMb > MAX_FILE_SIZE_MB) {
      toast.error(`File too large — max ${MAX_FILE_SIZE_MB} MB`);
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) {
      toast.error("Only image and video files are accepted");
      return;
    }

    const preview = isImage ? URL.createObjectURL(file) : "";
    const newFile: MediaFile = {
      file,
      preview,
      label: pendingLabel,
      type: isVideo ? "video" : "image",
      uploading: false,
    };

    const idx = mediaFiles.length;
    setMediaFiles((prev) => [...prev, newFile]);
    await uploadFile(file, idx);
  };

  const removeFile = (idx: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev];
      const item = updated[idx];
      if (item.preview) URL.revokeObjectURL(item.preview);
      updated.splice(idx, 1);
      return updated;
    });
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (rating < 1) { toast.error("Please select a star rating."); return; }
    if (body.trim().length < MIN_BODY) {
      toast.error(`Your review must be at least ${MIN_BODY} characters.`);
      return;
    }
    if (!name.trim()) { toast.error("Please enter your name."); return; }

    const pendingUploads = mediaFiles.filter((m) => m.uploading);
    if (pendingUploads.length > 0) {
      toast.error("Please wait for uploads to finish.");
      return;
    }
    const failedUploads = mediaFiles.filter((m) => m.error);
    if (failedUploads.length > 0) {
      toast.error("Some files failed to upload. Remove them or retry.");
      return;
    }

    const uploadedMedia = mediaFiles.filter((m) => m.storageId);

    setSubmitting(true);
    try {
      await submit({
        productId: activeProduct,
        customerName: name.trim(),
        customerEmail: "",
        rating,
        title: title.trim() || undefined,
        body: body.trim(),
        orderToken,
        mediaStorageIds: uploadedMedia.map((m) => m.storageId!),
        mediaTypes: uploadedMedia.map((m) => m.type),
        mediaLabels: uploadedMedia.map((m) => m.label),
      });
      setSubmitted((prev) => ({ ...prev, [activeProduct]: true }));
      resetFields();
    } catch (error) {
      if (error instanceof ConvexError) {
        const { message } = error.data as { code: string; message: string };
        toast.error(message);
      } else {
        toast.error("Could not submit your review. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const alreadySubmitted = submitted[activeProduct] === true;
  const allUploaded = mediaFiles.every((m) => !m.uploading);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45, duration: 0.5 }}
      className="mt-6 rounded-2xl border border-white/8 bg-card p-6"
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Collapsible header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-white/10 bg-background flex items-center justify-center shrink-0">
            <PenLine className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm">Write a review</p>
            <p className="text-xs text-muted-foreground">Share your experience with other buyers</p>
          </div>
        </div>
        <ChevronDown
          className={cn("w-5 h-5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" as const }}
            className="overflow-hidden"
          >
            <div className="pt-6">
              {/* Product tabs (multi-item orders) */}
              {multi && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {uniqueIds.map((id) => (
                    <button
                      key={id}
                      onClick={() => switchProduct(id)}
                      className={cn(
                        "text-xs font-medium rounded-full px-3.5 py-1.5 border transition-colors cursor-pointer flex items-center gap-1.5",
                        activeProduct === id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {submitted[id] && <Check className="w-3 h-3" />}
                      {nameMap[id] ?? "Product"}
                    </button>
                  ))}
                </div>
              )}

              {alreadySubmitted ? (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mx-auto mb-3">
                    <Check className="w-6 h-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1">Thank you for your review!</p>
                  <p className="text-xs text-muted-foreground">It will appear after approval.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Star rating */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      Your rating
                    </Label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHover(n)}
                          onMouseLeave={() => setHover(0)}
                          className="cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={cn(
                              "w-7 h-7 transition-colors",
                              (hover || rating) >= n
                                ? "text-amber-400 fill-amber-400"
                                : "text-white/20"
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <Label htmlFor="review-title" className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      Headline{" "}
                      <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
                    </Label>
                    <Input
                      id="review-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Sum up your experience"
                      maxLength={100}
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <Label htmlFor="review-body" className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      Your review
                    </Label>
                    <Textarea
                      id="review-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="What did you like? How are you using it?"
                      rows={4}
                      className="resize-none"
                    />
                    <p className={cn("text-[11px] mt-1.5", body.trim().length >= MIN_BODY ? "text-emerald-400" : "text-muted-foreground")}>
                      {body.trim().length < MIN_BODY
                        ? `${MIN_BODY - body.trim().length} more characters needed`
                        : "Looks good"}
                    </p>
                  </div>

                  {/* Name */}
                  <div>
                    <Label htmlFor="review-name" className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      Your name
                    </Label>
                    <Input
                      id="review-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Smith"
                      maxLength={60}
                    />
                  </div>

                  {/* ── Media upload section ──────────────────────────────── */}
                  <div>
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">
                      Attach screenshots or video{" "}
                      <span className="text-muted-foreground/60 normal-case tracking-normal">
                        (optional — max {MAX_FILES} files, {MAX_FILE_SIZE_MB} MB each)
                      </span>
                    </Label>

                    {/* Existing media thumbnails */}
                    {mediaFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {mediaFiles.map((m, i) => (
                          <MediaThumb key={i} item={m} onRemove={() => removeFile(i)} />
                        ))}
                      </div>
                    )}

                    {/* Add media button / picker */}
                    {mediaFiles.length < MAX_FILES && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker((s) => !s)}
                          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-dashed border-white/20 text-xs text-muted-foreground hover:text-foreground hover:border-white/40 transition-colors cursor-pointer"
                        >
                          <ImagePlus className="w-4 h-4" />
                          Add screenshot or video
                        </button>

                        <AnimatePresence>
                          {showMediaPicker && (
                            <motion.div
                              initial={{ opacity: 0, y: 6, scale: 0.97 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 6, scale: 0.97 }}
                              transition={{ duration: 0.15 }}
                              className="absolute top-full mt-2 left-0 z-20 bg-card border border-white/10 rounded-xl shadow-2xl p-2 min-w-[220px]"
                            >
                              {MEDIA_LABELS.map(({ label, accept, icon: Icon }) => (
                                <button
                                  key={label}
                                  type="button"
                                  onClick={() => handleLabelSelect(label, accept)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors cursor-pointer text-left"
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  {label}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {mediaFiles.length > 0 && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {mediaFiles.filter((m) => m.storageId).length}/{mediaFiles.length} uploaded
                        {mediaFiles.some((m) => m.uploading) && (
                          <span className="ml-1 inline-flex items-center gap-1 text-primary">
                            <Loader2 className="w-3 h-3 animate-spin" /> Uploading…
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !allUploaded}
                    className="rounded-full w-full sm:w-auto px-8 gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Submit review
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
