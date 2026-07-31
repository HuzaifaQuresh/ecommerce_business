import {
  ITEM_FULFILLMENT_META,
  ORDER_STATUS_META,
  type ItemFulfillmentStatus,
  type OrderStatus,
} from "@/lib/order-fulfillment";
import { cn } from "@/lib/utils";

const ORDER_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-800 border-amber-500/30",
  processing: "bg-sky-500/10 text-sky-800 border-sky-500/30",
  shipped: "bg-violet-500/10 text-violet-800 border-violet-500/30",
  delivered: "bg-emerald-500/10 text-emerald-800 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-800 border-red-500/30",
};

const ITEM_COLORS: Record<string, string> = {
  pending: "bg-slate-500/10 text-slate-700 border-slate-500/30",
  confirmed: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  dispatched: "bg-violet-500/10 text-violet-700 border-violet-500/30",
  in_transit: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/30",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const key = status as OrderStatus;
  const meta = ORDER_STATUS_META[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        ORDER_COLORS[status] ?? ORDER_COLORS.pending,
      )}
    >
      {meta?.label ?? status}
    </span>
  );
}

export function ItemFulfillmentBadge({ status }: { status: string }) {
  const key = status as ItemFulfillmentStatus;
  const meta = ITEM_FULFILLMENT_META[key];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        ITEM_COLORS[status] ?? ITEM_COLORS.pending,
      )}
    >
      {meta?.label ?? status}
    </span>
  );
}
