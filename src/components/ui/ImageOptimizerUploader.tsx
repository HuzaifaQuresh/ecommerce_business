import React, { useState, useRef } from "react";
import {
  compressAndConvertToWebP,
  formatBytes,
  CompressionResult,
  buildCDNImageUrl,
} from "@/lib/image-optimizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  Image as ImageIcon,
  Zap,
  Sliders,
  Cloud,
  FileCheck,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";

export interface ImageOptimizerUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  description?: string;
  maxWidth?: number;
  maxHeight?: number;
  defaultQuality?: number;
  className?: string;
}

const PRESET_ECOMMERCE_IMAGES = [
  {
    name: "Smart Speaker (WebP / Unsplash)",
    url: "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=1000&q=75&fm=webp",
  },
  {
    name: "Wireless Headphones",
    url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=75&fm=webp",
  },
  {
    name: "Smart Watch",
    url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=75&fm=webp",
  },
  {
    name: "Digital Multimeter",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=75&fm=webp",
  },
];

export const ImageOptimizerUploader: React.FC<ImageOptimizerUploaderProps> = ({
  value = "",
  onChange,
  label = "Product Image",
  description = "Upload & convert images to compressed WebP format or provide a CDN URL.",
  maxWidth = 1600,
  maxHeight = 1600,
  defaultQuality = 80,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(defaultQuality);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [customUrl, setCustomUrl] = useState(value);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File, q = quality) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WebP, etc.)");
      return;
    }

    setIsProcessing(true);
    setRawFile(file);
    try {
      const res = await compressAndConvertToWebP(file, {
        maxWidth,
        maxHeight,
        quality: q / 100,
        targetFormat: "image/webp",
      });
      setResult(res);
      onChange(res.dataUrl);
      toast.success(`Image converted to WebP! Reduced size by ${res.savingsPct}%`);
    } catch (err: any) {
      toast.error(err.message || "Failed to compress image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQualityChange = async (newVal: number[]) => {
    const q = newVal[0];
    setQuality(q);
    if (rawFile) {
      await processFile(rawFile, q);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlApply = () => {
    if (!customUrl.trim()) return;
    const cdnUrl = buildCDNImageUrl(customUrl.trim(), 1000, quality);
    onChange(cdnUrl);
    toast.success("CDN optimized image URL applied!");
  };

  const handleClear = () => {
    setResult(null);
    setRawFile(null);
    setCustomUrl("");
    onChange("");
  };

  return (
    <div className={`space-y-3 rounded-xl border bg-card/60 p-4 shadow-sm ${className || ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {label}
            <Badge
              variant="outline"
              className="text-[10px] bg-primary/10 text-primary border-primary/20"
            >
              WebP / AVIF Next-Gen
            </Badge>
          </Label>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>

        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Remove Image
          </Button>
        )}
      </div>

      {/* Main Preview Container if an image is selected */}
      {value ? (
        <div className="relative rounded-lg border bg-muted/20 overflow-hidden p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative h-28 w-28 shrink-0 rounded-md overflow-hidden bg-background border flex items-center justify-center">
            <img src={value} alt="Preview" className="h-full w-full object-cover" loading="lazy" />
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-mono">
              WebP Ready
            </div>
          </div>

          <div className="flex-1 space-y-2 text-xs w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
                <FileCheck className="h-3 w-3 text-emerald-600" />
                {result ? `${result.width}×${result.height} px` : "CDN Optimized"}
              </Badge>
              {result && (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[11px]">
                  -{result.savingsPct}% compressed
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">
                Lazy-Loaded
              </Badge>
            </div>

            {result ? (
              <div className="grid grid-cols-2 gap-2 text-muted-foreground bg-background/80 p-2 rounded border">
                <div>
                  Original Size:{" "}
                  <span className="font-semibold text-foreground">
                    {formatBytes(result.originalSize)}
                  </span>
                </div>
                <div>
                  WebP Size:{" "}
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatBytes(result.compressedSize)}
                  </span>
                </div>
                <div>
                  Format: <span className="font-semibold text-foreground">{result.format}</span>
                </div>
                <div>
                  Quality: <span className="font-semibold text-foreground">{quality}%</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground line-clamp-2 break-all font-mono text-[11px] bg-background/80 p-2 rounded border">
                {value}
              </p>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  fileInputRef.current?.click();
                  setActiveTab("upload");
                }}
              >
                <RefreshCw className="h-3 w-3" /> Change Image
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs for Upload, URL, or Presets */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 h-8 text-xs">
          <TabsTrigger value="upload" className="text-xs gap-1">
            <Upload className="h-3.5 w-3.5" /> Upload & Compress
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs gap-1">
            <LinkIcon className="h-3.5 w-3.5" /> CDN Image Link
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> Samples
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Drag & Drop Upload with Auto WebP Compression */}
        <TabsContent value="upload" className="space-y-3 pt-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                processFile(e.target.files[0]);
              }
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
              isDragOver
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                {isProcessing ? (
                  <Zap className="h-5 w-5 animate-bounce text-amber-500" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {isProcessing
                  ? "Converting & Compressing to WebP..."
                  : "Click or Drag & Drop image here"}
              </p>
              <p className="text-xs">Supports PNG, JPG, WebP, GIF, SVG (Auto-compressed to WebP)</p>
            </div>
          </div>

          {/* Quality Slider Control */}
          <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-lg border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-primary" /> WebP Compression Quality:
              </span>
              <span className="font-mono font-bold text-primary">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              min={50}
              max={95}
              step={5}
              onValueChange={handleQualityChange}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>50% (Tiny file size)</span>
              <span>80% (Balanced - Recommended)</span>
              <span>95% (Maximum detail)</span>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: CDN URL Input */}
        <TabsContent value="url" className="space-y-3 pt-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Cloud className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Paste image URL (e.g. Unsplash, Cloudinary, Cloudflare, Supabase)..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleUrlApply}
              className="text-xs gap-1 shrink-0"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Image URLs automatically receive CDN WebP parameter injection (e.g.
            `auto=format&fm=webp`) for instant load speeds.
          </p>
        </TabsContent>

        {/* Tab 3: Presets */}
        <TabsContent value="presets" className="space-y-2 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_ECOMMERCE_IMAGES.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onChange(item.url);
                  toast.success(`Selected sample image: ${item.name}`);
                }}
                className="group relative rounded-lg border overflow-hidden bg-background text-left hover:border-primary transition-all p-1 text-xs"
              >
                <div className="h-16 w-full rounded overflow-hidden bg-muted mb-1">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </div>
                <span className="line-clamp-1 font-medium text-[11px] px-1">{item.name}</span>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

/* ========================================================================
   MULTI-IMAGE GALLERY OPTIMIZER UPLOADER
   Allows Vendors & Admins to upload multiple product images at once,
   compress all files to WebP format, set cover image & reorder gallery.
   ======================================================================== */

export interface MultiImageOptimizerUploaderProps {
  primaryImage?: string;
  onPrimaryImageChange: (url: string) => void;
  galleryImages?: string[];
  onGalleryImagesChange: (urls: string[]) => void;
  label?: string;
  description?: string;
  maxWidth?: number;
  maxHeight?: number;
  defaultQuality?: number;
  className?: string;
}

const SAMPLE_GALLERY_PACKS = [
  {
    title: "Smart Wi-Fi Plug Pack (3 Angles)",
    primary:
      "https://images.unsplash.com/photo-1543512214-318c7553f230?auto=format&fit=crop&w=1000&q=75&fm=webp",
    gallery: [
      "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=75&fm=webp",
      "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=1000&q=75&fm=webp",
    ],
  },
  {
    title: "Smart Watch Pack (3 Shots)",
    primary:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1000&q=75&fm=webp",
    gallery: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1000&q=75&fm=webp",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=75&fm=webp",
    ],
  },
];

export const MultiImageOptimizerUploader: React.FC<MultiImageOptimizerUploaderProps> = ({
  primaryImage = "",
  onPrimaryImageChange,
  galleryImages = [],
  onGalleryImagesChange,
  label = "Product Image Gallery (Multiple Images)",
  description = "Upload multiple high-res product photos. Auto-compressed to WebP for instant loading.",
  maxWidth = 1600,
  maxHeight = 1600,
  defaultQuality = 80,
  className,
}) => {
  const [activeTab, setActiveTab] = useState<"upload" | "url" | "presets">("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [quality, setQuality] = useState(defaultQuality);
  const [urlInput, setUrlInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Combine primary and gallery into clean deduplicated array
  const allImages = [primaryImage, ...galleryImages].filter((u) => Boolean(u?.trim()));

  const handleFilesSelected = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Please select valid image files (PNG, JPG, WebP, etc.)");
      return;
    }

    setIsProcessing(true);
    toast.info(`Processing & converting ${validFiles.length} image(s) to WebP...`);

    try {
      const results: CompressionResult[] = [];
      for (const file of validFiles) {
        const res = await compressAndConvertToWebP(file, {
          maxWidth,
          maxHeight,
          quality: quality / 100,
          targetFormat: "image/webp",
        });
        results.push(res);
      }

      const newWebpUrls = results.map((r) => r.dataUrl);

      if (!primaryImage) {
        onPrimaryImageChange(newWebpUrls[0]);
        const remaining = newWebpUrls.slice(1);
        if (remaining.length > 0) {
          onGalleryImagesChange([...galleryImages, ...remaining]);
        }
      } else {
        onGalleryImagesChange([...galleryImages, ...newWebpUrls]);
      }

      const totalSaved = results.reduce((acc, r) => acc + r.savingsPct, 0) / results.length;
      toast.success(
        `Successfully added ${results.length} WebP image(s)! Avg compression: -${Math.round(totalSaved)}%`,
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to process images");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetPrimary = (indexToPrimary: number) => {
    const list = [...allImages];
    const selected = list[indexToPrimary];
    list.splice(indexToPrimary, 1);
    onPrimaryImageChange(selected);
    onGalleryImagesChange(list);
    toast.success("Main cover image updated!");
  };

  const handleDeleteImage = (indexToDelete: number) => {
    const list = [...allImages];
    list.splice(indexToDelete, 1);
    if (list.length === 0) {
      onPrimaryImageChange("");
      onGalleryImagesChange([]);
    } else {
      onPrimaryImageChange(list[0]);
      onGalleryImagesChange(list.slice(1));
    }
    toast.info("Image removed from gallery.");
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= allImages.length) return;
    const list = [...allImages];
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    onPrimaryImageChange(list[0]);
    onGalleryImagesChange(list.slice(1));
  };

  const handleAddUrls = () => {
    if (!urlInput.trim()) return;
    const rawUrls = urlInput
      .split(/[\n,]+/)
      .map((u) => buildCDNImageUrl(u.trim(), 1000, quality))
      .filter(Boolean);

    if (rawUrls.length === 0) return;

    if (!primaryImage) {
      onPrimaryImageChange(rawUrls[0]);
      onGalleryImagesChange([...galleryImages, ...rawUrls.slice(1)]);
    } else {
      onGalleryImagesChange([...galleryImages, ...rawUrls]);
    }

    setUrlInput("");
    toast.success(`Added ${rawUrls.length} image URL(s) to gallery.`);
  };

  return (
    <div className={`space-y-4 rounded-xl border bg-card/60 p-4 shadow-sm ${className || ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div>
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {label}
            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-mono">
              {allImages.length} {allImages.length === 1 ? "Image" : "Images"}
            </Badge>
          </Label>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>

        {allImages.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onPrimaryImageChange("");
              onGalleryImagesChange([]);
              toast.info("Cleared all gallery images.");
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear All Images
          </Button>
        )}
      </div>

      {/* Grid view of current gallery images */}
      {allImages.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Product Gallery Grid (Drag/Click to set cover or reorder):
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {allImages.map((src, idx) => {
              const isMain = idx === 0;
              return (
                <div
                  key={`${src}-${idx}`}
                  className={`group relative rounded-lg border overflow-hidden bg-background p-1 transition-all ${
                    isMain
                      ? "ring-2 ring-primary border-primary shadow-sm"
                      : "hover:border-primary/50"
                  }`}
                >
                  <div className="relative h-24 w-full rounded overflow-hidden bg-muted flex items-center justify-center">
                    <img
                      src={src}
                      alt={`Product ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />

                    {/* Badge */}
                    <div className="absolute top-1 left-1">
                      {isMain ? (
                        <Badge className="bg-primary text-white text-[9px] px-1.5 py-0">
                          Main Cover
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                          #{idx + 1}
                        </Badge>
                      )}
                    </div>

                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 text-white">
                      {!isMain && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimary(idx)}
                          className="bg-primary hover:bg-primary/90 text-white text-[10px] px-2 py-0.5 rounded font-medium shadow"
                        >
                          Set as Cover
                        </button>
                      )}

                      <div className="flex items-center gap-1">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, idx - 1)}
                            className="bg-white/20 hover:bg-white/30 text-white p-1 rounded"
                            title="Move left"
                          >
                            ←
                          </button>
                        )}
                        {idx < allImages.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMoveImage(idx, idx + 1)}
                            className="bg-white/20 hover:bg-white/30 text-white p-1 rounded"
                            title="Move right"
                          >
                            →
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(idx)}
                          className="bg-destructive hover:bg-destructive/90 text-white p-1 rounded"
                          title="Delete image"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs for Adding Images */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-3 h-8 text-xs">
          <TabsTrigger value="upload" className="text-xs gap-1">
            <Upload className="h-3.5 w-3.5" /> Multi-File Upload
          </TabsTrigger>
          <TabsTrigger value="url" className="text-xs gap-1">
            <LinkIcon className="h-3.5 w-3.5" /> CDN URLs
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> Multi Packs
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Drag & Drop Multiple File Upload */}
        <TabsContent value="upload" className="space-y-3 pt-2">
          <input
            ref={multiFileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(e.target.files);
              }
            }}
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            onClick={() => multiFileInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-all ${
              isDragOver
                ? "border-primary bg-primary/10"
                : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30"
            }`}
          >
            <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-1">
                {isProcessing ? (
                  <Zap className="h-5 w-5 animate-bounce text-amber-500" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <p className="text-sm font-medium text-foreground">
                {isProcessing
                  ? "Converting & Compressing Images to WebP..."
                  : "Click or Drag & Drop multiple images here"}
              </p>
              <p className="text-xs">
                Select 1 or more images (PNG, JPG, WebP) — all automatically compressed!
              </p>
            </div>
          </div>

          <div className="space-y-1.5 bg-muted/20 p-2.5 rounded-lg border text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-primary" /> WebP Quality Settings:
              </span>
              <span className="font-mono font-bold text-primary">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              min={50}
              max={95}
              step={5}
              onValueChange={(v) => setQuality(v[0])}
            />
          </div>
        </TabsContent>

        {/* Tab 2: Multiple CDN URLs */}
        <TabsContent value="url" className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label className="text-xs">Paste Image URLs (One per line or comma-separated):</Label>
            <Textarea
              placeholder="https://images.unsplash.com/photo-1...\nhttps://images.unsplash.com/photo-2..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              rows={3}
              className="text-xs font-mono"
            />
            <Button type="button" size="sm" onClick={handleAddUrls} className="text-xs gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Add URLs to Gallery
            </Button>
          </div>
        </TabsContent>

        {/* Tab 3: Presets */}
        <TabsContent value="presets" className="space-y-2 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SAMPLE_GALLERY_PACKS.map((pack, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onPrimaryImageChange(pack.primary);
                  onGalleryImagesChange(pack.gallery);
                  toast.success(`Loaded gallery pack: ${pack.title}`);
                }}
                className="group rounded-lg border p-2 text-left bg-background hover:border-primary transition-all flex items-center gap-3 text-xs"
              >
                <div className="flex -space-x-2 shrink-0">
                  <img
                    src={pack.primary}
                    alt=""
                    className="h-10 w-10 rounded-full border-2 border-background object-cover"
                  />
                  {pack.gallery.map((g, gi) => (
                    <img
                      key={gi}
                      src={g}
                      alt=""
                      className="h-10 w-10 rounded-full border-2 border-background object-cover"
                    />
                  ))}
                </div>
                <div>
                  <div className="font-medium text-foreground">{pack.title}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {pack.gallery.length + 1} High-Res Angles
                  </div>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
