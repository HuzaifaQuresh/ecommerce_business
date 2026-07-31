import React, { useState } from "react";
import { buildCDNImageUrl } from "@/lib/image-optimizer";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string | null | undefined;
  alt: string;
  widthPx?: number;
  quality?: number;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
}

/**
 * High Performance Image component with automatic Next-Gen WebP/AVIF CDN formatting,
 * native lazy loading (`loading="lazy"`), async decoding, and smooth load transition.
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  widthPx = 800,
  quality = 80,
  fallbackSrc = "/placeholder-product.svg",
  className,
  containerClassName,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const optimizedSrc = isError ? fallbackSrc : buildCDNImageUrl(src, widthPx, quality);

  return (
    <div className={cn("relative overflow-hidden bg-muted/30", containerClassName)}>
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
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsError(true)}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          {...props}
        />
      )}
    </div>
  );
};
