import type { DeliveryMethod } from "@/types/commerce";

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type ItemFulfillmentStatus =
  "pending" | "confirmed" | "dispatched" | "in_transit" | "delivered" | "cancelled";

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; description: string; step: number }
> = {
  pending: {
    label: "Order placed",
    description: "We received your order and are confirming payment.",
    step: 1,
  },
  processing: {
    label: "Processing",
    description: "Items are being picked and packed at our warehouse.",
    step: 2,
  },
  shipped: {
    label: "Dispatched",
    description: "Courier has collected your package — in transit.",
    step: 3,
  },
  delivered: {
    label: "Delivered",
    description: "Order completed. Thank you for shopping with NexusIoT.",
    step: 4,
  },
  cancelled: { label: "Cancelled", description: "This order was cancelled.", step: 0 },
};

export const ITEM_FULFILLMENT_META: Record<
  ItemFulfillmentStatus,
  { label: string; description: string }
> = {
  pending: { label: "Pending", description: "Awaiting confirmation" },
  confirmed: { label: "Confirmed", description: "Reserved in warehouse" },
  dispatched: { label: "Dispatched", description: "Handed to courier" },
  in_transit: { label: "In transit", description: "On the way to you" },
  delivered: { label: "Delivered", description: "Received" },
  cancelled: { label: "Cancelled", description: "Line item cancelled" },
};

const DELIVERY_DAYS: Record<string, number> = {
  standard: 5,
  express: 2,
  pickup: 0,
};

/** Estimated delivery date from order time + delivery method */
export function estimateDeliveryDate(deliveryMethodId: string, orderedAt: Date = new Date()): Date {
  const days = DELIVERY_DAYS[deliveryMethodId] ?? 5;
  const result = new Date(orderedAt);
  if (deliveryMethodId === "pickup") {
    result.setHours(18, 0, 0, 0);
    if (result < orderedAt) result.setDate(result.getDate() + 1);
    return result;
  }
  result.setDate(result.getDate() + days);
  return result;
}

export function formatDeliveryDate(
  iso: string | null | undefined,
  deliveryMethod?: string,
): string {
  if (!iso) return "TBC";
  const d = new Date(iso);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  const base = d.toLocaleDateString("en-PK", opts);
  if (deliveryMethod === "pickup") return `${base} (pickup by 6 PM)`;
  return base;
}

export function formatAddressBlock(order: {
  address: string;
  city: string;
  province?: string | null;
  postal_code?: string | null;
  landmark?: string | null;
}): string[] {
  const lines: string[] = [order.address];
  const cityLine = [order.city, order.province].filter(Boolean).join(", ");
  if (cityLine) lines.push(cityLine);
  if (order.postal_code) lines.push(`Postal: ${order.postal_code}`);
  if (order.landmark) lines.push(`Near: ${order.landmark}`);
  return lines;
}

/** Map order status → default item fulfillment when placing order */
export function defaultItemStatusForOrder(orderStatus: OrderStatus): ItemFulfillmentStatus {
  if (orderStatus === "delivered") return "delivered";
  if (orderStatus === "shipped") return "in_transit";
  if (orderStatus === "processing") return "confirmed";
  if (orderStatus === "cancelled") return "cancelled";
  return "pending";
}

export function deliveryEtaLabel(method?: DeliveryMethod | null): string {
  return method?.eta ?? "3–5 business days";
}
