import { useRef, useState } from "react";
import { Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { compressAndConvertToWebP } from "@/lib/image-optimizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CompactMerchImage({
  value,
  onChange,
  fallbackUrl,
  round = false,
  size = 72,
  wide = false,
  maxWidth,
  maxHeight,
}: {
  value: string;
  onChange: (url: string) => void;
  fallbackUrl?: string | null;
  round?: boolean;
  size?: number;
  wide?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const preview = value || fallbackUrl || "";
  const urlField = value.startsWith("data:") ? "" : value;
  const boxW = wide ? Math.round(size * 1.85) : size;
  const boxH = size;

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a PNG, JPG, or WebP image");
      return;
    }
    setBusy(true);
    try {
      const result = await compressAndConvertToWebP(file, {
        maxWidth: maxWidth ?? (round ? 400 : wide ? 1280 : 640),
        maxHeight: maxHeight ?? (round ? 400 : wide ? 640 : 400),
        quality: 0.82,
        targetFormat: "image/webp",
      });
      onChange(result.dataUrl);
      toast.success(`Image compressed (${result.savingsPct}% smaller)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "relative shrink-0 overflow-hidden border bg-slate-50 grid place-items-center text-slate-400 hover:border-[#0052B4]/50 transition",
          round ? "rounded-full" : "rounded-lg",
        )}
        style={{ width: boxW, height: boxH }}
        aria-label="Upload image"
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-contain object-center bg-slate-950/5" />
        ) : (
          <ImageIcon className="h-5 w-5" />
        )}
        {busy && (
          <span className="absolute inset-0 grid place-items-center bg-white/70">
            <Loader2 className="h-4 w-4 animate-spin text-[#0052B4]" />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <Input
          className="h-8 text-xs"
          placeholder="Paste image URL"
          value={urlField}
          onChange={(e) => onChange(e.target.value)}
        />
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px] px-2"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            <Upload className="h-3 w-3 mr-1" /> Upload
          </Button>
          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px] px-2 text-muted-foreground"
              onClick={() => onChange("")}
            >
              <X className="h-3 w-3 mr-1" /> Clear
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void processFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
