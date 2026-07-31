import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { fmtPKR } from "@/lib/format";
import { formatDeliveryDate } from "@/lib/order-fulfillment";
import type { OrderWithItems } from "@/types/commerce";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { ShippingAddressCard } from "@/components/orders/ShippingAddressCard";
import { OrderLineItems } from "@/components/orders/OrderLineItems";
import { SectionCard } from "@/components/site/PageLayout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Calendar, CreditCard, Hash, Printer, Copy, Check, RotateCcw } from "lucide-react";

export function OrderDetailView({
  order,
  backTo,
  backLabel,
  showAdminControls,
  onItemStatusChange,
  adminSlot,
}: {
  order: OrderWithItems;
  backTo: string;
  backLabel: string;
  showAdminControls?: boolean;
  onItemStatusChange?: (itemId: string, status: string) => void;
  adminSlot?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const { add } = useCart();
  const navigate = useNavigate();

  const handleCopyId = () => {
    navigator.clipboard.writeText(order.id);
    setCopied(true);
    toast.success("Order ID copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleReorder = () => {
    let reorderedCount = 0;
    for (const item of order.items) {
      if (item.product_id) {
        add({
          id: item.product_id,
          title: item.title,
          price_pkr: Number(item.price_pkr),
          image_url: item.image_url ?? undefined,
          slug: item.product_slug ?? "iot-product",
          quantity: item.quantity,
        });
        reorderedCount += item.quantity;
      }
    }
    if (reorderedCount > 0) {
      toast.success(`${reorderedCount} item(s) added back to your cart`);
      navigate({ to: "/cart" });
    } else {
      toast.info("Browsing products catalog to reorder items");
      navigate({ to: "/products" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Link
            to={backTo}
            className="text-sm text-muted-foreground hover:text-primary mb-2 inline-block font-medium"
          >
            ← {backLabel}
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight font-mono">Order #{order.id}</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="h-8 gap-1.5 text-xs"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy ID"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed{" "}
            {new Date(order.created_at).toLocaleString("en-PK", {
              dateStyle: "full",
              timeStyle: "short",
            })}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <OrderStatusBadge status={order.status} />
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
          <Button variant="default" size="sm" onClick={handleReorder} className="gap-1.5 text-xs">
            <RotateCcw className="h-3.5 w-3.5" /> Reorder
          </Button>
        </div>
      </div>

      <SectionCard title="Order progress">
        <OrderTimeline status={order.status} />
      </SectionCard>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border bg-card p-4 space-y-3 shadow-sm">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
            Delivery Estimate & Tracking
          </h3>
          <p className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {formatDeliveryDate(order.expected_delivery_at, order.delivery_method)}
          </p>
          <p className="text-sm text-muted-foreground capitalize">
            Delivery Method: {order.delivery_method?.replace(/_/g, " ") ?? "Standard Shipping"}
          </p>
          {order.tracking_number ? (
            <div className="p-2.5 rounded-lg bg-muted/50 text-sm flex items-center justify-between font-mono">
              <span className="flex items-center gap-2 text-xs">
                <Hash className="h-4 w-4 text-primary shrink-0" />
                Tracking #{order.tracking_number}
              </span>
              <span className="text-xs text-primary font-semibold">Active</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tracking number will be assigned upon dispatch.
            </p>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 space-y-2 shadow-sm">
          <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">
            Payment Summary
          </h3>
          <p className="capitalize flex items-center gap-2 font-medium text-sm">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment via{" "}
            {String(order.payment_method ?? "cod")
              .replace(/_/g, " ")
              .toUpperCase()}
          </p>
          <div className="border-t pt-2 space-y-1 text-sm">
            {order.subtotal_pkr != null && (
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{fmtPKR(Number(order.subtotal_pkr))}</span>
              </div>
            )}
            {Number(order.shipping_pkr) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping</span>
                <span>{fmtPKR(Number(order.shipping_pkr))}</span>
              </div>
            )}
            {Number(order.tax_pkr) > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax / GST</span>
                <span>{fmtPKR(Number(order.tax_pkr))}</span>
              </div>
            )}
            {Number(order.discount_pkr) > 0 && (
              <div className="flex justify-between text-primary font-medium">
                <span>Discount {order.voucher_code ? `(${order.voucher_code})` : ""}</span>
                <span>−{fmtPKR(Number(order.discount_pkr))}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-1.5 border-t">
              <span>Total Paid</span>
              <span className="text-primary">{fmtPKR(Number(order.total_pkr))}</span>
            </div>
          </div>
        </div>
      </div>

      <ShippingAddressCard order={order} />

      <SectionCard title={`Ordered Products (${order.items.length})`}>
        <OrderLineItems
          items={order.items}
          showAdminControls={showAdminControls}
          onStatusChange={onItemStatusChange}
        />
      </SectionCard>

      {adminSlot}
    </div>
  );
}
