import { useRef, useState } from "react";
import { useMutation } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type Props = {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  error?: string;
};

export default function ImageUploader({ value, onChange, label, hint, error }: Props) {
  const uploadProductImage = useMutation(api.storage.uploadProductImage);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const publicUrl = await uploadProductImage({ file });
      onChange(publicUrl);
      toast.success("Image uploaded");
    } catch {
      toast.error("Upload failed — please try again");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="text-sm font-medium text-foreground">
          {label}
          {hint && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{hint}</span>}
        </label>
      )}

      {value ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-background h-32">
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full border border-white/20 cursor-pointer transition-colors"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-300 px-3 py-1.5 rounded-full border border-red-500/30 cursor-pointer transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "h-24 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors",
            dragging ? "border-primary bg-primary/10" : "border-white/15 hover:border-white/30 bg-background/50 hover:bg-background/80",
            error && "border-red-500/50",
            uploading && "cursor-wait"
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground text-center">
                Drop image here or <span className="text-primary">click to upload</span>
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or paste URL</span>
        <div className="h-px flex-1 bg-white/8" />
      </div>
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className={cn(
          "w-full rounded-lg border border-white/10 bg-background text-sm text-foreground placeholder:text-muted-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50",
          error && "border-red-500/50"
        )}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}
