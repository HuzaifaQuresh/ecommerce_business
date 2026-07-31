import { useState } from "react";
import { ImageOff } from "lucide-react";
import {
  optimizeProductImageUrl,
  productImageSrcSet,
  PRODUCT_IMAGE_PLACEHOLDER,
  type ProductImageSize,
} from "@/lib/product-image";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  size?: ProductImageSize;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  srcSet?: boolean;
  onLoad?: () => void;
};

export function ProductImage({
  src,
  alt,
  size = "card",
  className,
  imgClassName,
  priority = false,
  srcSet = false,
  onLoad,
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const optimized = optimizeProductImageUrl(src, size);
  const displaySrc = failed ? PRODUCT_IMAGE_PLACEHOLDER : optimized;
  const set = srcSet && !failed ? productImageSrcSet(src) : undefined;

  return (
    <div className={cn("relative overflow-hidden bg-muted/50", className)}>
      {!loaded && !failed && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      {failed && (
        <div
          className="absolute inset-0 grid place-items-center text-muted-foreground/50"
          aria-hidden
        >
          <ImageOff className="h-10 w-10" />
        </div>
      )}
      <img
        src={displaySrc}
        srcSet={set}
        sizes={srcSet ? "(max-width: 1024px) 100vw, 560px" : undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
        onError={() => {
          setFailed(true);
          setLoaded(true);
        }}
        className={cn(
          "h-full w-full transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}
