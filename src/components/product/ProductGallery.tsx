import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductImage } from "@/components/product/ProductImage";
import { optimizeProductImageUrl, PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/product-image";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  images: string[];
};

export function ProductGallery({ title, images }: Props) {
  const gallery = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const u of images) {
      const key = u?.trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        out.push(key);
      }
    }
    return out.length ? out : [PRODUCT_IMAGE_PLACEHOLDER];
  }, [images]);

  const [active, setActive] = useState(0);
  const thumbStripRef = useRef<HTMLDivElement>(null);
  const galleryKey = gallery.join("|");

  useEffect(() => {
    setActive(0);
  }, [galleryKey]);

  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const thumb = strip.querySelector<HTMLElement>(`[data-thumb-index="${active}"]`);
    thumb?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [active]);

  const mainSrc = gallery[active] ?? gallery[0];
  const canSlide = gallery.length > 1;

  const go = (dir: -1 | 1) => {
    setActive((i) => {
      const next = i + dir;
      if (next < 0) return gallery.length - 1;
      if (next >= gallery.length) return 0;
      return next;
    });
  };

  return (
    <div className="w-full min-w-0 rounded-xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Main stage — Tuya-style hero */}
      <div className="relative w-full bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/40 dark:to-card">
        <div className="relative mx-auto w-full aspect-square max-h-[min(88vw,480px)] lg:max-h-[520px]">
          <ProductImage
            src={mainSrc}
            alt={title}
            size="detail"
            priority
            srcSet
            className="absolute inset-0 h-full w-full"
            imgClassName="object-contain p-4 sm:p-6"
          />
        </div>
      </div>

      {/* Thumbnail strip with side arrows */}
      <div className="flex items-center gap-1 sm:gap-2 border-t border-border bg-card px-2 py-3 sm:px-4 sm:py-4">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!canSlide}
          aria-label="Previous image"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition",
            canSlide ? "hover:bg-muted hover:text-foreground" : "opacity-30 cursor-not-allowed",
          )}
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
        </button>

        <div
          ref={thumbStripRef}
          className="flex flex-1 items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto scroll-smooth px-1 py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {gallery.map((src, i) => {
            const isActive = active === i;
            return (
              <button
                key={`${src}-${i}`}
                type="button"
                data-thumb-index={i}
                onClick={() => setActive(i)}
                aria-label={`Image ${i + 1} of ${gallery.length}`}
                aria-current={isActive}
                className={cn(
                  "relative h-[4.25rem] w-[4.25rem] sm:h-[4.75rem] sm:w-[4.75rem] shrink-0 overflow-hidden rounded-md bg-muted transition-all duration-200",
                  isActive
                    ? "border-2 border-[#2563eb] opacity-100 shadow-sm"
                    : "border border-border/50 opacity-70 hover:opacity-100 hover:border-border",
                )}
              >
                <img
                  src={optimizeProductImageUrl(src, "thumb")}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={!canSlide}
          aria-label="Next image"
          className={cn(
            "grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition",
            canSlide ? "hover:bg-muted hover:text-foreground" : "opacity-30 cursor-not-allowed",
          )}
        >
          <ChevronRight className="h-5 w-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
