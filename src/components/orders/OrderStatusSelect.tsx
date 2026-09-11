import {
  ORDER_STATUS_META,
  type OrderStatus,
} from "@/lib/order-fulfillment";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const TRIGGER_COLORS: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-900",
  processing: "border-sky-500/40 bg-sky-500/10 text-sky-900",
  shipped: "border-violet-500/40 bg-violet-500/10 text-violet-900",
  delivered: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900",
  cancelled: "border-red-500/40 bg-red-500/10 text-red-900",
};

export function OrderStatusSelect({
  value,
  onChange,
  disabled,
  className,
}: {
  value: string;
  onChange: (next: OrderStatus) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}) {
  const status = (ORDER_STATUSES.includes(value as OrderStatus) ? value : "pending") as OrderStatus;

  return (
    <Select
      value={status}
      disabled={disabled}
      onValueChange={(next) => {
        void onChange(next as OrderStatus);
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 min-w-[140px] text-xs font-semibold capitalize",
          TRIGGER_COLORS[status] ?? TRIGGER_COLORS.pending,
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ORDER_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs capitalize">
            {ORDER_STATUS_META[s].label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
