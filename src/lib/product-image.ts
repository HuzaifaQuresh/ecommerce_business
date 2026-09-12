/** Responsive, compressed image URLs for product UI (Unsplash + Supabase-friendly). */

export type ProductImageSize = "thumb" | "card" | "detail" | "hero" | "banner";

const SIZE: Record<
  ProductImageSize,
  { w: number; q: number; fit: "crop" | "max"; supabaseResize: "contain" | "cover" }
> = {
  thumb: { w: 96, q: 68, fit: "crop", supabaseResize: "cover" },
  card: { w: 360, q: 70, fit: "crop", supabaseResize: "contain" },
  detail: { w: 720, q: 75, fit: "crop", supabaseResize: "contain" },
  // Full-bleed marketing frames — cover fills the slot (no side/top bars).
  hero: { w: 1600, q: 78, fit: "crop", supabaseResize: "cover" },
  banner: { w: 1400, q: 78, fit: "crop", supabaseResize: "cover" },
};

export const PRODUCT_IMAGE_PLACEHOLDER = "/placeholder-product.svg";

function stripTransformParams(url: string): string {
  try {
    const u = new URL(url);
    ["width", "height", "resize", "quality", "format"].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

export function optimizeProductImageUrl(
  src: string | null | undefined,
  size: ProductImageSize = "card",
): string {
  if (!src?.trim()) return PRODUCT_IMAGE_PLACEHOLDER;
  const url = src.trim();
  if (url.startsWith("/") || url.startsWith("data:")) return url;

  const { w, q, fit, supabaseResize } = SIZE[size];
  const h =
    size === "hero" || size === "banner" ? Math.round(w * 0.5) : Math.round(w * 0.75);

  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return `${base}?w=${w}&h=${h}&q=${q}&auto=format&fm=webp&fit=${fit}&cs=tinysrgb`;
  }

  if (url.includes("supabase.co/storage/v1/object/public")) {
    const clean = stripTransformParams(url);
    const sep = clean.includes("?") ? "&" : "?";
    return `${clean}${sep}width=${w}&height=${h}&resize=${supabaseResize}&quality=${q}`;
  }

  return url;
}

/** srcset for responsive product images — smaller files on mobile */
export function productImageSrcSet(
  src: string | null | undefined,
  size: ProductImageSize = "card",
): string | undefined {
  if (!src?.trim()) return undefined;
  const url = src.trim();
  const { w, q, fit, supabaseResize } = SIZE[size];
  const widths = [Math.round(w * 0.67), w, Math.round(w * 1.5)];
  const ratio = size === "hero" || size === "banner" ? 0.5 : 0.75;

  if (url.includes("images.unsplash.com")) {
    const base = url.split("?")[0];
    return widths
      .map((width) => {
        const h = Math.round(width * ratio);
        return `${base}?w=${width}&h=${h}&q=${q}&auto=format&fm=webp&fit=${fit} ${width}w`;
      })
      .join(", ");
  }

  if (url.includes("supabase.co/storage/v1/object/public")) {
    const clean = stripTransformParams(url);
    return widths
      .map((width) => {
        const h = Math.round(width * ratio);
        const sep = clean.includes("?") ? "&" : "?";
        return `${clean}${sep}width=${width}&height=${h}&resize=${supabaseResize}&quality=${q} ${width}w`;
      })
      .join(", ");
  }

  return undefined;
}

export function productImageSizes(size: ProductImageSize = "card"): string {
  if (size === "thumb") return "96px";
  if (size === "detail" || size === "hero" || size === "banner") {
    return "(max-width: 768px) 100vw, 720px";
  }
  return "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 360px";
}

export function buildProductGalleryImages(
  imageUrl: string | null | undefined,
  galleryUrls?: string[] | null | unknown,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (u: unknown) => {
    if (typeof u !== "string") return;
    const key = u.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  add(imageUrl);

  let list: unknown[] = [];
  if (Array.isArray(galleryUrls)) {
    list = galleryUrls;
  } else if (typeof galleryUrls === "string") {
    try {
      const parsed = JSON.parse(galleryUrls);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      /* ignore */
    }
  }

  for (const item of list) {
    add(item);
  }

  if (out.length === 1 && typeof out[0] === "string" && out[0].includes("images.unsplash.com")) {
    const base = out[0].split("?")[0];
    const variants = [
      `${base}?w=800&q=82&auto=format&fit=crop`,
      `${base}?w=800&q=82&auto=format&fit=crop&crop=entropy`,
      `${base}?w=800&q=80&auto=format&fit=crop&crop=edges`,
      `${base}?w=800&q=78&auto=format&fit=crop&sat=-20`,
      `${base}?w=800&q=85&auto=format&fit=crop&blur=0`,
    ];
    return variants;
  }

  return out.length ? out : [PRODUCT_IMAGE_PLACEHOLDER];
}
