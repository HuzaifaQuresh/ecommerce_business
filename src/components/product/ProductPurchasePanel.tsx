import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ShoppingCart,
  Star,
  Minus,
  Plus,
  Wifi,
  Zap,
  Cpu,
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  Headset,
  Tag,
  Check,
} from "lucide-react";
import { fmtPKR, AVAILABILITY_LABEL } from "@/lib/format";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { ProductRow } from "@/types/commerce";
import { calcVoucherDiscount } from "@/api/vouchers";
import type { Voucher } from "@/types/commerce";
import { cn } from "@/lib/utils";

type Props = {
  product: ProductRow;
  activeVoucher?: Voucher | null;
};

export function ProductPurchasePanel({ product, activeVoucher }: Props) {
  const { add } = useCart();
  const { isWishlisted, toggleWishlist, setDrawerOpen: openWishlistDrawer } = useWishlist();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [copied, setCopied] = useState(false);

  const discountPct = Number(product.discount_pct) || 0;
  const pricePkr = Number(product.price_pkr) || 0;
  const inStock = product.availability === "in_stock" && product.stock > 0;
  const original = discountPct > 0 ? pricePkr / (1 - discountPct / 100) : null;

  const safeTags = Array.isArray(product.tags) ? product.tags : [];
  const safeSpecs =
    product.specs && typeof product.specs === "object"
      ? (product.specs as Record<string, string>)
      : {};

  const iotMeta = [
    {
      icon: Wifi,
      label: "Protocol",
      value:
        safeSpecs?.protocol ||
        safeTags.find((t) => /zigbee|wifi|matter|bluetooth|lora|z-wave/i.test(t)) ||
        "Zigbee 3.0",
    },
    {
      icon: Zap,
      label: "Power",
      value: safeSpecs?.power || "12V DC / Battery",
    },
    {
      icon: Cpu,
      label: "Ecosystem",
      value: safeSpecs?.ecosystem || "Tuya Smart / Smart Life",
    },
  ];

  const cartPayload = {
    id: product.id,
    title: product.title,
    price_pkr: product.price_pkr,
    image_url: product.image_url,
    slug: product.slug,
  };

  const buyNow = () => {
    if (!inStock) {
      toast.error("Item not available");
      return;
    }
    add(cartPayload, qty);
    navigate({ to: "/checkout" });
  };

  const isFav = isWishlisted(product.id);

  const handleToggleWishlist = () => {
    toggleWishlist({
      id: product.id,
      title: product.title,
      price_pkr: product.price_pkr,
      image_url: product.image_url,
      slug: product.slug,
      category: product.category,
    });
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} on NexusIoT Pakistan!`,
      url,
    };

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err?.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Product link copied to clipboard!");
        setTimeout(() => setCopied(false), 2500);
        return;
      } catch {
        // Fallback
      }
    }

    toast.info(`Link: ${url}`);
  };

  return (
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide">
        {product.manufacturer}
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mt-1">{product.title}</h1>
      <div className="flex items-center gap-2 mt-2 text-sm">
        <div className="flex items-center gap-1 text-warning">
          <Star className="h-4 w-4 fill-current" />
          <span className="text-foreground font-medium">{product.rating}</span>
        </div>
        <span className="text-muted-foreground">• {product.category}</span>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <span className="text-3xl sm:text-4xl font-bold text-primary">
          {fmtPKR(product.price_pkr)}
        </span>
        {original && (
          <>
            <span className="text-lg text-muted-foreground line-through">
              {fmtPKR(Math.round(original))}
            </span>
            <Badge variant="destructive">-{product.discount_pct}%</Badge>
          </>
        )}
      </div>

      {activeVoucher && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          Voucher {activeVoucher.code}: save up to{" "}
          {fmtPKR(calcVoucherDiscount(activeVoucher, product.price_pkr * qty))} at checkout
        </div>
      )}

      <div className="mt-4">
        <Badge
          variant={inStock ? "default" : "secondary"}
          className={inStock ? "bg-emerald-600 text-white" : ""}
        >
          {AVAILABILITY_LABEL[product.availability || "in_stock"] || "In Stock"}
          {inStock && ` • ${product.stock} available`}
        </Badge>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {iotMeta.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3 w-3" /> {label}
            </div>
            <div className="text-sm font-semibold mt-1 truncate">{value}</div>
          </div>
        ))}
      </div>

      {safeTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {safeTags.map((t) => (
            <Badge key={t} variant="outline">
              #{t}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="inline-flex items-center border rounded-lg self-start">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 hover:bg-muted"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="px-4 font-medium">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 hover:bg-muted"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          size="lg"
          variant="outline"
          disabled={!inStock}
          onClick={() => {
            add(cartPayload, qty);
            toast.success(`Added ${qty} × ${product.title}`);
          }}
          className="flex-1 border-primary text-primary hover:bg-primary/10"
        >
          <ShoppingCart className="h-4 w-4 mr-2" /> Add to Cart
        </Button>
        <Button
          size="lg"
          disabled={!inStock}
          onClick={buyNow}
          className="flex-1 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
        >
          Buy Now
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={cn(
            "inline-flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-md border transition-all cursor-pointer",
            isFav
              ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border-border",
          )}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-transform active:scale-125",
              isFav && "fill-rose-500 text-rose-500",
            )}
          />
          {isFav ? "Saved in Wishlist" : "Add to Wishlist"}
        </button>

        <span className="text-muted-foreground/40">•</span>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 px-3 py-1.5 rounded-md border border-border transition-all cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-600">Copied Link!</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4" />
              <span>Share Product</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => openWishlistDrawer(true)}
          className="ml-auto text-xs text-primary hover:underline font-medium"
        >
          View Wishlist →
        </button>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
        {[
          [ShieldCheck, "1-Year Warranty"],
          [Truck, "Pan-Pakistan Shipping"],
          [Headset, "Engineer Support"],
        ].map(([Icon, label]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <div
              key={label as string}
              className="flex flex-col items-center gap-1 p-3 rounded-lg border bg-card"
            >
              <I className="h-5 w-5 text-primary" />
              <span>{label as string}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
