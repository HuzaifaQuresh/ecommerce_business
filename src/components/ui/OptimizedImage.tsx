import React, { useState } from "react";
import { buildCDNImageUrl } from "@/lib/image-optimizer";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  /** Intrinsic width hint for CLS / auditor sizing checks */
  widthPx?: number;
  /** Intrinsic height hint — defaults to 3:4 of widthPx for product cards */
  heightPx?: number;
  quality?: number;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  /** Prefer contain so products are not stretched/cropped oddly */
  fit?: "contain" | "cover";
}

function srcSetFor(url: string, widthPx: number, quality: number): string | undefined {
  if (!url.includes("images.unsplash.com") && !url.includes("supabase.co/storage")) {
    return undefined;
  }
  const widths = Array.from(
    new Set([Math.round(widthPx * 0.5), widthPx, Math.round(widthPx * 1.5)].filter((w) => w >= 64)),
  );
  return widths
    .map((w) => `${buildCDNImageUrl(url, w, quality)} ${w}w`)
    .join(", ");
}

/**
 * High Performance Image component with CDN sizing, lazy load, and fixed aspect (no distortion).
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  widthPx = 800,
  heightPx,
  quality = 80,
  fallbackSrc = "/placeholder-product.svg",
  className,
  containerClassName,
  fit = "contain",
  loading,
  sizes,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const intrinsicH = heightPx ?? Math.round(widthPx * 0.75);
  const raw = (src || "").trim();
  const optimizedSrc = isError ? fallbackSrc : buildCDNImageUrl(raw || null, widthPx, quality);
  const srcSet = !isError && raw ? srcSetFor(raw, widthPx, quality) : undefined;

  return (
    <div
      className={cn("relative overflow-hidden bg-muted/30", containerClassName)}
      style={{ aspectRatio: `${widthPx} / ${intrinsicH}` }}
    >
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-muted/50 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        </div>
      )}

      {isError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-muted/60 text-muted-foreground text-xs">
          <ImageOff className="h-5 w-5 mb-1 opacity-60" />
          <span className="line-clamp-1">{alt || "Image unavailable"}</span>
        </div>
      ) : (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes ?? `(max-width: 640px) 50vw, ${widthPx}px`}
          alt={alt}
          width={widthPx}
          height={intrinsicH}
          loading={loading ?? "lazy"}
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsError(true)}
          className={cn(
            "absolute inset-0 h-full w-full transition-opacity duration-300",
            fit === "cover" ? "object-cover" : "object-contain",
            "object-center",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          {...props}
        />
      )}
    </div>
  );
};
