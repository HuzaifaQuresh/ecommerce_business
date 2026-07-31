import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import { useCheckoutConfig } from "@/hooks/useSiteSettings";
import { computeCheckoutTotals } from "@/lib/checkout-totals";
import { fmtPKR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, EmptyState } from "@/components/site/PageLayout";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — NexusIoT" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const { data: config } = useCheckoutConfig();

  const estimate = useMemo(() => {
    const delivery = config?.delivery_methods.find((d) => d.id === "standard")?.charge_pkr ?? 250;
    if (!config) return { total: subtotal + delivery, shipping: delivery, tax: 0 };
    const t = computeCheckoutTotals({
      subtotal,
      discount: 0,
      deliveryCharge: delivery,
      taxRatePct: config.tax_rate_pct,
      paymentMethodId: "cod",
      paymentMethods: config.payment_methods,
      freeShippingMinPkr: config.free_shipping_min_pkr,
      codHandlingFeePkr: config.cod_handling_fee_pkr,
    });
    return t;
  }, [config, subtotal]);

  if (items.length === 0) {
    return (
      <PageContainer size="md">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Browse our IoT catalog and add sensors, cameras, and gateways."
          action={
            <Button asChild size="lg">
              <Link to="/products">Continue shopping</Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="lg">
      <PageHeader
        title={`Shopping Cart (${items.length})`}
        description="Review items before checkout."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,360px)] gap-6 lg:gap-8">
        <div className="space-y-3 order-2 lg:order-1">
          {items.map((i) => (
            <article
              key={i.id}
              className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border bg-card shadow-[var(--shadow-card)]"
            >
              {i.image_url && (
                <img
                  src={i.image_url}
                  alt={i.title}
                  className="h-28 w-full sm:h-24 sm:w-24 rounded-lg object-cover shrink-0"
                />
              )}
              <div className="flex-1 min-w-0 flex flex-col">
                <Link
                  to="/products/$slug"
                  params={{ slug: i.slug }}
                  className="font-medium hover:text-primary line-clamp-2"
                >
                  {i.title}
                </Link>
                <p className="text-primary font-semibold mt-1 tabular-nums">
                  {fmtPKR(i.price_pkr)}
                </p>
                <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center border rounded-lg">
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.quantity - 1)}
                      className="px-3 py-2 min-h-[44px] hover:bg-muted"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 min-w-[2rem] text-center">{i.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.quantity + 1)}
                      className="px-3 py-2 min-h-[44px] hover:bg-muted"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    className="p-2 min-h-[44px] text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex sm:flex-col items-center justify-between sm:justify-start sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0">
                <span className="text-sm text-muted-foreground sm:hidden">Line total</span>
                <span className="font-semibold text-lg tabular-nums">
                  {fmtPKR(i.price_pkr * i.quantity)}
                </span>
              </div>
            </article>
          ))}
          <Button variant="ghost" size="sm" onClick={clear}>
            Clear cart
          </Button>
        </div>

        <aside className="order-1 lg:order-2 rounded-xl border bg-card p-5 h-fit space-y-3 lg:sticky lg:top-32 shadow-[var(--shadow-card)]">
          <h3 className="font-semibold text-lg">Order Summary</h3>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span className="tabular-nums">{fmtPKR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Est. delivery</span>
            <span className="tabular-nums">
              {estimate.shipping === 0 ? "Free" : fmtPKR(estimate.shipping)}
            </span>
          </div>
          {estimate.tax > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Est. {config?.tax_label ?? "tax"}</span>
              <span className="tabular-nums">{fmtPKR(estimate.tax)}</span>
            </div>
          )}
          <div className="border-t pt-3 flex justify-between font-bold text-lg">
            <span>Est. total</span>
            <span className="text-primary tabular-nums">{fmtPKR(estimate.total)}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Final total at checkout includes payment method & vouchers.
          </p>
          <Button asChild className="w-full min-h-[48px]" size="lg">
            <Link to="/checkout">Proceed to Checkout</Link>
          </Button>
        </aside>
      </div>
    </PageContainer>
  );
}
