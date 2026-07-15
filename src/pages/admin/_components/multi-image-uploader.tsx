import { useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Upload, X, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type Props = {
  value: string;         // newline-separated URLs
  onChange: (val: string) => void;
  label?: string;
  hint?: string;
};

export default function MultiImageUploader({ value, onChange, label, hint }: Props) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const resolveStorageUrl = useMutation(api.storage.resolveStorageUrl);
  // Track count of in-flight uploads so spinner stays while any are pending
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");

  const urls = value.split("\n").map((u) => u.trim()).filter(Boolean);

  // Use a ref to always have the latest URLs without stale closures
  const urlsRef = useRef<string[]>(urls);
  urlsRef.current = urls;

  const setUrls = useCallback((list: string[]) => onChange(list.join("\n")), [onChange]);

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(`"${file.name}" is not an image`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 10 MB limit`);
      return;
    }
    setUploadingCount((c) => c + 1);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = await res.json() as { storageId: string };
      const publicUrl = await resolveStorageUrl({ storageId });
      // Always append to the latest list via the ref so concurrent uploads all land
      setUrls([...urlsRef.current, publicUrl]);
      toast.success(`"${file.name}" uploaded`);
    } catch {
      toast.error(`Failed to upload "${file.name}" — try again`);
    } finally {
      setUploadingCount((c) => c - 1);
    }
  }, [generateUploadUrl, resolveStorageUrl, setUrls]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(uploadFile);
  }, [uploadFile]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeUrl = (idx: number) => {
    setUrls(urls.filter((_, i) => i !== idx));
  };

  const addUrlInput = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrls([...urls, trimmed]);
    setUrlInput("");
  };

  const isUploading = uploadingCount > 0;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
        </label>
      )}

      {/* Combined drop zone — works whether empty or has images */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "rounded-xl border-2 border-dashed transition-colors p-2",
          dragging ? "border-primary bg-primary/10" : "border-white/10 hover:border-white/20"
        )}
      >
        {urls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {urls.map((url, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-white/10 bg-background h-24">
                <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeUrl(i)}
                  className="absolute top-1 right-1 bg-black/70 hover:bg-red-500/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Upload more tile */}
            <div
              onClick={() => !isUploading && inputRef.current?.click()}
              className={cn(
                "h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-colors",
                isUploading
                  ? "border-primary/40 cursor-wait"
                  : "border-white/15 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
              )}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-[10px] text-muted-foreground">{uploadingCount} uploading…</p>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">Add more</p>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Empty state */
          <div
            onClick={() => !isUploading && inputRef.current?.click()}
            className={cn(
              "h-24 flex flex-col items-center justify-center gap-1.5 rounded-lg",
              isUploading ? "cursor-wait" : "cursor-pointer"
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground">{uploadingCount} uploading…</p>
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground text-center">
                  Drop images here or <span className="text-primary">click to upload</span>
                </p>
                <p className="text-[10px] text-muted-foreground/60">Select multiple files at once</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Paste URL option */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or paste URL</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrlInput())}
          placeholder="https://... then press Enter"
          className="flex-1 rounded-lg border border-white/10 bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={addUrlInput}
          disabled={!urlInput.trim()}
          className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-foreground disabled:opacity-40 cursor-pointer transition-colors"
        >
          Add
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}
