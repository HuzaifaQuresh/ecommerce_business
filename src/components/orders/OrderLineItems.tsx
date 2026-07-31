import { Link } from "@tanstack/react-router";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate, ITEM_FULFILLMENT_META } from "@/lib/order-fulfillment";
import type { OrderItemRow } from "@/types/commerce";
import { ItemFulfillmentBadge } from "@/components/orders/OrderStatusBadge";
import { optimizeProductImageUrl } from "@/lib/product-image";
import { Package, Truck, Calendar } from "lucide-react";

export function OrderLineItems({
  items,
  showAdminControls,
  onStatusChange,
}: {
  items: OrderItemRow[];
  showAdminControls?: boolean;
  onStatusChange?: (itemId: string, status: string) => void;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No line items recorded.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const lineTotal = Number(item.price_pkr) * item.quantity;
        const meta =
          ITEM_FULFILLMENT_META[item.fulfillment_status as keyof typeof ITEM_FULFILLMENT_META];
        return (
          <li
            key={item.id}
            className="flex gap-3 sm:gap-4 rounded-xl border bg-background p-3 sm:p-4"
          >
            <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-lg overflow-hidden bg-muted border">
              {item.image_url ? (
                <img
                  src={optimizeProductImageUrl(item.image_url, "thumb")}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-muted-foreground/40">
                  <Package className="h-6 w-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  {item.product_slug ? (
                    <Link
                      to="/products/$slug"
                      params={{ slug: item.product_slug }}
                      className="font-semibold hover:text-primary line-clamp-2"
                    >
                      {item.title}
                    </Link>
                  ) : (
                    <p className="font-semibold line-clamp-2">{item.title}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Qty {item.quantity} × {fmtPKR(Number(item.price_pkr))}
                  </p>
                </div>
                <p className="font-semibold tabular-nums shrink-0">{fmtPKR(lineTotal)}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ItemFulfillmentBadge status={item.fulfillment_status ?? "pending"} />
                {meta && <span className="text-xs text-muted-foreground">{meta.description}</span>}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. delivery: {formatDeliveryDate(item.expected_delivery_at)}
                </span>
                {item.dispatched_at && (
                  <span className="inline-flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Dispatched {formatDeliveryDate(item.dispatched_at)}
                  </span>
                )}
              </div>

              {showAdminControls && onStatusChange && (
                <select
                  className="text-xs border rounded-md px-2 py-1.5 bg-card max-w-[10rem]"
                  value={item.fulfillment_status ?? "pending"}
                  onChange={(e) => onStatusChange(item.id, e.target.value)}
                >
                  {Object.keys(ITEM_FULFILLMENT_META).map((s) => (
                    <option key={s} value={s}>
                      {ITEM_FULFILLMENT_META[s as keyof typeof ITEM_FULFILLMENT_META].label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
