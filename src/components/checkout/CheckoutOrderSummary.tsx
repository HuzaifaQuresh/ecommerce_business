import { fmtPKR } from "@/lib/format";
import type { CheckoutTotals } from "@/types/commerce";
import { Tag, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

type CartLine = { id: string; title: string; price_pkr: number; quantity: number };

export function CheckoutOrderSummary({
  items,
  totals,
  taxLabel,
  voucherSlot,
  appliedCode,
  paymentLabel,
  deliveryLabel,
  className,
}: {
  items: CartLine[];
  totals: CheckoutTotals;
  taxLabel: string;
  voucherSlot?: React.ReactNode;
  appliedCode?: string | null;
  paymentLabel?: string;
  deliveryLabel?: string;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "rounded-xl border bg-card p-5 h-fit space-y-4 shadow-[var(--shadow-card)] lg:sticky lg:top-28",
        className,
      )}
    >
      <h3 className="font-semibold text-lg">Order summary</h3>

      <div className="space-y-2 max-h-56 overflow-y-auto text-sm border-b pb-3">
        {items.map((i) => (
          <div key={i.id} className="flex justify-between gap-2">
            <span className="line-clamp-2 text-muted-foreground">
              {i.title} <span className="text-foreground">× {i.quantity}</span>
            </span>
            <span className="font-medium shrink-0 tabular-nums">
              {fmtPKR(i.price_pkr * i.quantity)}
            </span>
          </div>
        ))}
      </div>

      {voucherSlot}

      {appliedCode && (
        <p className="text-xs text-primary flex items-center gap-1">
          <Tag className="h-3 w-3" /> Voucher {appliedCode} applied
        </p>
      )}

      <div className="space-y-2 text-sm">
        <Row label="Subtotal" value={fmtPKR(totals.subtotal)} />
        {totals.discount > 0 && (
          <Row label="Voucher discount" value={`−${fmtPKR(totals.discount)}`} accent />
        )}
        <Row
          label={
            totals.free_shipping_applied ? (
              <span className="flex items-center gap-1">
                Delivery <span className="text-emerald-600 text-xs font-medium">FREE</span>
              </span>
            ) : (
              `Delivery (${deliveryLabel ?? "Standard"})`
            )
          }
          value={totals.shipping === 0 ? "Free" : fmtPKR(totals.shipping)}
        />
        <Row label={taxLabel} value={fmtPKR(totals.tax)} />
        {totals.payment_fee > 0 && (
          <Row label={`Payment fee (${paymentLabel ?? ""})`} value={fmtPKR(totals.payment_fee)} />
        )}
      </div>

      <div className="flex justify-between items-baseline font-bold text-xl border-t pt-4">
        <span>Total (PKR)</span>
        <span className="text-primary tabular-nums">{fmtPKR(totals.total)}</span>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Prices include {taxLabel.toLowerCase()} where applicable. Final amount confirmed at payment
        {paymentLabel ? ` via ${paymentLabel}` : ""}.
      </p>
    </aside>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: React.ReactNode;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-2", accent && "text-primary")}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums shrink-0">{value}</span>
    </div>
  );
}

export function FreeShippingBanner({ minPkr, subtotal }: { minPkr: number; subtotal: number }) {
  const remaining = minPkr - subtotal;
  if (remaining <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
        <Truck className="h-4 w-4 shrink-0" />
        You qualify for <strong>free delivery</strong> on this order.
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground">
      <Truck className="h-4 w-4 shrink-0" />
      Add <strong className="text-foreground">{fmtPKR(remaining)}</strong> more for free delivery
      (orders over {fmtPKR(minPkr)}).
    </div>
  );
}
