import { ORDER_STATUS_META, type OrderStatus } from "@/lib/order-fulfillment";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const FLOW: OrderStatus[] = ["pending", "processing", "shipped", "delivered"];

export function OrderTimeline({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <p className="text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
        This order has been cancelled.
      </p>
    );
  }

  const current = ORDER_STATUS_META[status as OrderStatus]?.step ?? 1;

  return (
    <ol className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-0 sm:justify-between">
      {FLOW.map((step, i) => {
        const meta = ORDER_STATUS_META[step];
        const done = meta.step <= current;
        const active = meta.step === current;
        return (
          <li
            key={step}
            className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 flex-1 relative"
          >
            {i < FLOW.length - 1 && (
              <span
                className={cn(
                  "hidden sm:block absolute top-4 left-[calc(50%+1rem)] right-0 h-0.5 -translate-y-1/2",
                  done && meta.step < current ? "bg-primary" : "bg-muted",
                )}
                aria-hidden
              />
            )}
            <div
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-xs font-bold",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted bg-muted/30 text-muted-foreground",
                active && done && "ring-2 ring-primary/30",
              )}
            >
              {done && meta.step < current ? <Check className="h-4 w-4" /> : meta.step}
            </div>
            <div className="sm:text-center min-w-0">
              <p
                className={cn(
                  "text-sm font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {meta.label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block max-w-[8rem]">
                {meta.description}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
