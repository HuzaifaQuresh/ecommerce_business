import React from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Star, Heart } from "lucide-react";
import { fmtPKR } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { cn } from "@/lib/utils";

export type Product = {
  id: string;
  title: string;
  slug: string;
  price_pkr: number;
  image_url: string | null;
  category: string;
  manufacturer: string | null;
  discount_pct: number;
  availability: string;
  rating: number | null;
  stock: number;
};

export const ProductCard = React.memo(function ProductCard({
  p,
  view = "grid",
  priority = false,
}: {
  p: Product;
  view?: "grid" | "list";
  priority?: boolean;
}) {
  const { add } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const original = p.discount_pct > 0 ? p.price_pkr / (1 - p.discount_pct / 100) : null;
  const inStock = p.availability === "in_stock" && p.stock > 0;
  const detailTo = "/products/$slug" as const;
  const productSlug = p.slug || p.id;
  const isFav = isWishlisted(p.id);

  const onToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: p.id,
      title: p.title,
      price_pkr: p.price_pkr,
      image_url: p.image_url,
      slug: productSlug,
      category: p.category,
    });
  };

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) {
      toast.error("Item not available");
      return;
    }
    add({
      id: p.id,
      title: p.title,
      price_pkr: p.price_pkr,
      image_url: p.image_url,
      slug: productSlug,
    });
    toast.success("Added to cart");
  };

  // Generate a mock but stable rating and review count based on the product ID hash for consistency
  const stableHash = p.id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const ratingValue = p.rating ?? 4.0 + (stableHash % 10) / 10; // 4.0 to 4.9
  const reviewCount = 5 + (stableHash % 145); // 5 to 149 reviews

  if (view === "list") {
    return (
      <div className="flex gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition group relative">
        <Link
          to={detailTo}
          params={{ slug: productSlug }}
          className="relative h-28 w-28 sm:h-36 sm:w-36 shrink-0 rounded-md bg-slate-50 border border-slate-100 overflow-hidden block"
        >
          <img
            src={optimizeProductImageUrl(p.image_url, "card")}
            alt={p.title}
            width="144"
            height="144"
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "low"}
            className="h-full w-full object-cover group-hover:scale-105 transition duration-500"
          />
          {p.discount_pct > 0 && (
            <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
              -{p.discount_pct}%
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <Link to={detailTo} params={{ slug: productSlug }} className="block">
              <div className="text-[10px] text-slate-400 font-semibold tracking-wide uppercase">
                {p.manufacturer || "Nexus"} • {p.category}
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-800 mt-1 line-clamp-2 hover:text-primary transition-colors leading-snug">
                {p.title}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                <div className="flex items-center text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span className="font-bold text-slate-800 ml-1 text-xs">
                    {ratingValue.toFixed(1)}
                  </span>
                </div>
                <span className="text-slate-400 text-[11px]">({reviewCount} reviews)</span>
              </div>
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-base sm:text-lg font-black text-primary leading-none">
                  {fmtPKR(p.price_pkr)}
                </span>
                {original && (
                  <span className="text-xs text-slate-400 line-through">
                    {fmtPKR(Math.round(original))}
                  </span>
                )}
              </div>
              <span
                className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 ${inStock ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500"}`}
              >
                {inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            <Button
              size="sm"
              onClick={onAdd}
              disabled={!inStock}
              className="bg-primary hover:bg-primary/90 text-white font-bold h-9 px-4 shadow-sm"
              aria-label={`Add ${p.title} to cart`}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" /> Add to Cart
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="group flex flex-col rounded-lg border border-slate-200/70 bg-white overflow-hidden hover:shadow-md hover:border-primary/20 transition-all duration-300 relative">
      <Link
        to={detailTo}
        params={{ slug: productSlug }}
        className="block relative aspect-[4/3] bg-slate-50 border-b border-slate-100 overflow-hidden"
      >
        <img
          src={optimizeProductImageUrl(p.image_url, "card")}
          alt={p.title}
          width="360"
          height="270"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : "low"}
          className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition duration-500"
        />
        {p.discount_pct > 0 && (
          <span className="absolute top-2 left-2 bg-primary text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded shadow-sm">
            -{p.discount_pct}%
          </span>
        )}
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={isFav ? "Remove from wishlist" : "Add to wishlist"}
          className={cn(
            "absolute top-2 right-2 p-1.5 rounded-full backdrop-blur-md transition-all shadow-sm z-10",
            isFav
              ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
              : "bg-white/80 text-slate-600 hover:text-rose-600 hover:bg-white",
          )}
        >
          <Heart
            className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isFav && "fill-rose-500 text-rose-500")}
          />
        </button>
        {!inStock && (
          <span className="absolute bottom-2 right-2 bg-slate-900/85 text-white text-[9px] font-bold px-2 py-0.5 rounded">
            Out of Stock
          </span>
        )}
      </Link>
      <div className="p-3 flex flex-col flex-1 justify-between bg-white">
        <Link to={detailTo} params={{ slug: productSlug }} className="block">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            {p.manufacturer || "NexusIoT"}
          </div>
          <h3 className="text-xs sm:text-sm font-medium text-slate-800 mt-1 line-clamp-2 min-h-[36px] sm:min-h-[40px] hover:text-primary transition-colors leading-tight">
            {p.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-[10px] sm:text-xs">
            <div className="flex items-center text-amber-500">
              <Star className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />
              <span className="font-bold text-slate-800 ml-0.5 text-[10px] sm:text-xs">
                {ratingValue.toFixed(1)}
              </span>
            </div>
            <span className="text-slate-400 text-[10px]">({reviewCount})</span>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-sm sm:text-base font-extrabold text-primary leading-none">
                {fmtPKR(p.price_pkr)}
              </span>
              {original && (
                <span className="text-[10px] sm:text-xs text-slate-400 line-through">
                  {fmtPKR(Math.round(original))}
                </span>
              )}
            </div>
          </div>
        </Link>
        <Button
          size="sm"
          className="mt-3 w-full bg-primary hover:bg-primary/90 text-white font-bold h-8 text-xs sm:text-sm transition shadow-sm"
          onClick={onAdd}
          disabled={!inStock}
          aria-label={`Add ${p.title} to cart`}
        >
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Add
        </Button>
      </div>
    </article>
  );
});
