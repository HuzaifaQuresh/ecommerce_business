import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Truck, ShieldCheck, ArrowRight, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useCheckoutConfig } from "@/hooks/useSiteSettings";
import { fmtPKR } from "@/lib/format";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { DEFAULT_CHECKOUT_CONFIG } from "@/lib/checkout-totals";

export function CartDrawer() {
  const { items, count, drawerOpen, setDrawerOpen, setQty, remove, subtotal, justAddedId } =
    useCart();
  const { user } = useAuth();
  const { data: config } = useCheckoutConfig();
  const freeMin = config?.free_shipping_min_pkr ?? DEFAULT_CHECKOUT_CONFIG.free_shipping_min_pkr;
  const remaining = Math.max(0, freeMin - subtotal);
  const shipProgress = freeMin > 0 ? Math.min(100, Math.round((subtotal / freeMin) * 100)) : 100;
  const addedRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!justAddedId || !drawerOpen) return;
    addedRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [justAddedId, drawerOpen, items]);

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[420px] border-l border-[#E2E8F0] [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:bg-white/10 [&>button]:hover:opacity-100"
      >
        <SheetHeader className="space-y-0 border-b border-[#E2E8F0] bg-[#0B192C] px-5 py-4 pr-12 text-left">
          <SheetTitle className="flex items-center gap-3 text-white">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/10">
              <ShoppingBag className="h-5 w-5 text-[#FF7A00]" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-bold tracking-tight">Shopping Cart</span>
              <span className="text-xs font-medium text-white/60">
                {count === 0 ? "No items yet" : `${count} ${count === 1 ? "item" : "items"}`}
              </span>
            </span>
          </SheetTitle>
          <SheetDescription className="sr-only">
            Review items in your cart, update quantities, and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 py-12 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-100">
              <ShoppingBag className="h-8 w-8 text-slate-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-[#0B192C]">Your cart is empty</p>
            <p className="mt-1 max-w-[240px] text-sm text-muted-foreground">
              Add sensors, cameras, and smart devices — they will appear here instantly.
            </p>
            <Button
              className="mt-6 bg-[#FF7A00] hover:bg-[#E56E00] text-white font-bold"
              onClick={() => setDrawerOpen(false)}
              asChild
            >
              <Link to="/products">Browse products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-[#E2E8F0] bg-slate-50 px-5 py-3">
              {remaining <= 0 ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
                  <Truck className="h-4 w-4 shrink-0" />
                  Free delivery unlocked on this order
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <Truck className="mt-0.5 h-4 w-4 shrink-0 text-[#0052B4]" />
                    <p>
                      Add <span className="font-bold text-[#0B192C]">{fmtPKR(remaining)}</span> more
                      for free delivery
                    </p>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[#FF7A00] transition-all duration-500"
                      style={{ width: `${shipProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {items.map((i) => {
                const added = justAddedId === i.id;
                return (
                  <div
                    key={i.id}
                    ref={added ? addedRowRef : undefined}
                    className={cn(
                      "relative flex gap-3 rounded-xl border bg-white p-3 shadow-[var(--shadow-card)] transition-all",
                      added ? "border-[#FF7A00] ring-2 ring-[#FF7A00]/20" : "border-[#E2E8F0]",
                    )}
                  >
                    {added && (
                      <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-[#FF7A00] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        <Check className="h-3 w-3" /> Added
                      </span>
                    )}
                    <Link
                      to="/products/$slug"
                      params={{ slug: i.slug }}
                      onClick={() => setDrawerOpen(false)}
                      className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#E2E8F0] bg-slate-50"
                    >
                      <img
                        src={optimizeProductImageUrl(i.image_url, "thumb")}
                        alt={i.title}
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/products/$slug"
                          params={{ slug: i.slug }}
                          onClick={() => setDrawerOpen(false)}
                          className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B192C] hover:text-[#0052B4]"
                        >
                          {i.title}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(i.id)}
                          className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-destructive"
                          aria-label={`Remove ${i.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{fmtPKR(i.price_pkr)} each</p>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <div className="inline-flex h-8 items-center overflow-hidden rounded-lg border border-[#E2E8F0]">
                          <button
                            type="button"
                            onClick={() => setQty(i.id, i.quantity - 1)}
                            className="grid h-8 w-8 place-items-center hover:bg-slate-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[1.75rem] text-center text-sm font-bold tabular-nums">
                            {i.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQty(i.id, i.quantity + 1)}
                            className="grid h-8 w-8 place-items-center hover:bg-slate-50"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-black tabular-nums text-[#0B192C]">
                          {fmtPKR(i.price_pkr * i.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 border-t border-[#E2E8F0] bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Subtotal</span>
                <span className="text-lg font-black tabular-nums text-[#0B192C]">
                  {fmtPKR(subtotal)}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-[#0052B4]" />
                Shipping and tax calculated at checkout
              </p>
              <Button
                asChild
                className="h-12 w-full bg-[#FF7A00] text-base font-bold text-white shadow-sm hover:bg-[#E56E00]"
                onClick={() => setDrawerOpen(false)}
              >
                {user ? (
                  <Link to="/checkout">
                    Checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                ) : (
                  <Link to="/auth" search={{ redirect: "/checkout", tab: "signin" }}>
                    Sign in to checkout
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="h-10 flex-1 border-[#0052B4] font-semibold text-[#0052B4] hover:bg-blue-50"
                  onClick={() => setDrawerOpen(false)}
                >
                  <Link to="/cart">View cart</Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 flex-1 text-slate-600"
                  onClick={() => setDrawerOpen(false)}
                >
                  Continue shopping
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
