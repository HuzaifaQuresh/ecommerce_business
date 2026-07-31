import { formatAddressBlock } from "@/lib/order-fulfillment";
import type { OrderRow } from "@/types/commerce";
import { MapPin, Phone, Mail, User } from "lucide-react";

export function ShippingAddressCard({ order }: { order: OrderRow }) {
  const lines = formatAddressBlock(order);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        Delivery address
      </h3>
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <p className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            {order.customer_name}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {order.phone}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            {order.email}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 space-y-1">
          {lines.map((line) => (
            <p key={line} className="text-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
