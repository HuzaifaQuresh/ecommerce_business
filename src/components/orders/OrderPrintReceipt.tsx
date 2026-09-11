import { fmtPKR } from "@/lib/format";
import { formatAddressBlock, formatDeliveryDate, ORDER_STATUS_META } from "@/lib/order-fulfillment";
import type { OrderWithItems } from "@/types/commerce";

/** Print-only receipt layout (visible when window.print / .print:block). */
export function OrderPrintReceipt({ order }: { order: OrderWithItems }) {
  const items = order.items ?? [];
  const statusLabel =
    ORDER_STATUS_META[order.status as keyof typeof ORDER_STATUS_META]?.label ?? order.status;
  const payment = String(order.payment_method ?? "cod").replace(/_/g, " ").toUpperCase();
  const addressLines = formatAddressBlock(order);

  return (
    <div className="hidden print:block print:p-0 text-black">
      <div className="mx-auto max-w-[720px] space-y-5 text-[12px] leading-relaxed">
        <header className="flex items-start justify-between border-b border-black pb-3">
          <div>
            <div className="text-xl font-black tracking-tight">SmartZone</div>
            <div className="text-[11px] text-neutral-600">smartzone.pk · Blue Area, Islamabad</div>
            <div className="text-[11px] text-neutral-600">info@smartzone.pk · +92 332 3059259</div>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold uppercase tracking-wide">Sales receipt</div>
            <div className="font-mono text-[11px]">#{order.id.slice(0, 12).toUpperCase()}</div>
            <div className="text-[11px] text-neutral-600">
              {new Date(order.created_at).toLocaleString("en-PK", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Bill to
            </div>
            <div className="font-semibold">{order.customer_name}</div>
            <div>{order.phone}</div>
            <div>{order.email}</div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Ship to
            </div>
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3 rounded border border-neutral-300 p-3">
          <div>
            <div className="text-[10px] font-bold uppercase text-neutral-500">Status</div>
            <div className="font-semibold">{statusLabel}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-neutral-500">Payment</div>
            <div className="font-semibold">{payment}</div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-neutral-500">Delivery</div>
            <div className="font-semibold">
              {formatDeliveryDate(order.expected_delivery_at, order.delivery_method)}
            </div>
          </div>
        </section>

        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-black">
              <th className="py-2 pr-2 font-bold">Item</th>
              <th className="py-2 px-2 font-bold text-right">Qty</th>
              <th className="py-2 px-2 font-bold text-right">Price</th>
              <th className="py-2 pl-2 font-bold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const line = Number(item.price_pkr) * Number(item.quantity);
              return (
                <tr key={item.id} className="border-b border-neutral-200 align-top">
                  <td className="py-2 pr-2">
                    <div className="font-medium">{item.title}</div>
                    {item.product_slug ? (
                      <div className="font-mono text-[10px] text-neutral-500">{item.product_slug}</div>
                    ) : null}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{fmtPKR(Number(item.price_pkr))}</td>
                  <td className="py-2 pl-2 text-right tabular-nums font-semibold">{fmtPKR(line)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="ml-auto w-64 space-y-1">
          {order.subtotal_pkr != null ? (
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtPKR(Number(order.subtotal_pkr))}</span>
            </div>
          ) : null}
          {Number(order.shipping_pkr) > 0 ? (
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="tabular-nums">{fmtPKR(Number(order.shipping_pkr))}</span>
            </div>
          ) : null}
          {Number(order.tax_pkr) > 0 ? (
            <div className="flex justify-between">
              <span>Tax / GST</span>
              <span className="tabular-nums">{fmtPKR(Number(order.tax_pkr))}</span>
            </div>
          ) : null}
          {Number(order.discount_pkr) > 0 ? (
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="tabular-nums">−{fmtPKR(Number(order.discount_pkr))}</span>
            </div>
          ) : null}
          {Number(order.payment_fee_pkr) > 0 ? (
            <div className="flex justify-between">
              <span>Payment fee</span>
              <span className="tabular-nums">{fmtPKR(Number(order.payment_fee_pkr))}</span>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-black pt-2 text-sm font-black">
            <span>Total</span>
            <span className="tabular-nums">{fmtPKR(Number(order.total_pkr))}</span>
          </div>
        </section>

        {order.tracking_number ? (
          <p className="text-[11px]">
            Tracking: <span className="font-mono font-semibold">{order.tracking_number}</span>
          </p>
        ) : null}
        {order.admin_notes ? (
          <p className="text-[11px] text-neutral-600">Notes: {order.admin_notes}</p>
        ) : null}

        <footer className="border-t border-neutral-300 pt-3 text-[10px] text-neutral-500">
          Thank you for shopping at SmartZone. This is a computer-generated receipt.
        </footer>
      </div>
    </div>
  );
}
